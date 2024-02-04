import { dbFactory, type CtxAsync } from "@vlcn.io/react"

export function useDB(dbname: string): CtxAsync | null {
	return dbFactory.getHook(dbname)?.() ?? null
}
