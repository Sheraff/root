import { useMutation } from "@tanstack/react-query"
import { type CtxAsync } from "@vlcn.io/react"
import { useDB } from "client/db/useDb"
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
		if (!ctx) return
		statement.current = ctx.db.prepare(query)
		return () => void statement.current?.then((s) => s.finalize(null))
	}, [ctx, query])
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
