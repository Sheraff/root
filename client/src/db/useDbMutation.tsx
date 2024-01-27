import { useMutation } from "@tanstack/react-query"
import { useDB, type CtxAsync } from "@vlcn.io/react"
import { useEffect, useRef } from "react"

type DBAsync = CtxAsync["db"]
type StmtAsync = Awaited<ReturnType<DBAsync["prepare"]>>

export function useDbMutation<TBindings extends ReadonlyArray<string> = [], TData = null>({
	dbName,
	query,
	returning,
}: TData extends null
	? {
			dbName: string
			query: string
			returning?: false
		}
	: {
			dbName: string
			query: string
			returning: true
		}) {
	const ctx = useDB(dbName)
	const statement = useRef<Promise<StmtAsync> | null>(null)
	useEffect(() => {
		statement.current = ctx.db.prepare(query)
		return () => void statement.current?.then((s) => s.finalize(null))
	}, [query])
	type TReturnData = TData extends null ? void : TData[]
	return useMutation<TReturnData, unknown, TBindings>({
		mutationFn(bindings) {
			if (returning) {
				return statement.current?.then((s) =>
					s.all(null, ...bindings)
				) as Promise<TReturnData>
			} else {
				return statement.current?.then((s) =>
					s.run(null, ...bindings)
				) as Promise<TReturnData>
			}
		},
	})
}
