import { useMutation, type UseMutationOptions } from "@tanstack/react-query"
import { useDb, type Ctx } from "client/db/DbProvider"
import { useEffect, useRef } from "react"

type DB = Ctx["db"]
type StmtAsync = Awaited<ReturnType<DB["prepare"]>>

export function useDbMutation<
	TBindings extends ReadonlyArray<string | number> = [],
	TData = null,
	TReturnData extends TData extends null ? void : TData[] = TData extends null ? void : TData[],
>({
	dbName,
	query,
	returning,
	onSuccess,
}: {
	dbName: string
	query: string
	onSuccess?: UseMutationOptions<TReturnData, unknown, TBindings>["onSuccess"]
} & (TData extends null
	? {
			returning?: false
		}
	: {
			returning: true
		})) {
	const ctx = useDb(dbName)
	const statement = useRef<Promise<StmtAsync> | null>(null)
	useEffect(() => {
		if (!ctx) return
		statement.current = ctx.db.prepare(query)
		return () => void statement.current?.then((s) => s.finalize(null))
	}, [ctx, query])
	return useMutation<TReturnData, unknown, TBindings>({
		mutationFn(bindings) {
			if (!statement.current)
				throw new Error(`Statement not prepared, did you instantiate the db "${dbName}"?`)
			if (returning) {
				return statement.current.then((s) =>
					s.all(null, ...bindings)
				) as Promise<TReturnData>
			} else {
				return statement.current.then((s) =>
					s.run(null, ...bindings)
				) as Promise<TReturnData>
			}
		},
		networkMode: "always",
		retry: false,
		onSuccess,
	})
}
