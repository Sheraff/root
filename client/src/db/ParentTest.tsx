import { DBProvider as BaseDbProvider } from "@vlcn.io/react"
import schema from "@repo/assets/test-v0.sql"
import type { ReactNode } from "react"
import { useCacheManager } from "@repo/client/db/useDbQuery"

function ReactQueryAdapter({ name, children }: { name: string; children: ReactNode }) {
	useCacheManager(name)
	return children
}

export function DbProvider({ name, children }: { name: string; children: ReactNode }) {
	return (
		<BaseDbProvider
			dbname={name}
			schema={{
				name: "test-v0",
				content: schema.replace(/[\s\n\t]+/g, " ").trim(),
			}}
			fallback={<div>Creating DB {name}</div>}
			Render={() => <ReactQueryAdapter name={name}>{children}</ReactQueryAdapter>}
		/>
	)
}
