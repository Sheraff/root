import { fooBar } from "shared/foo/bar"
import { ServiceWorkerDemo } from "client/components/ServiceWorkerDemo"
import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { UserAccountDemo } from "client/components/UserAccountDemo"
import { WorkerDemo } from "client/components/WorkerDemo"
import { DbDemo } from "client/components/DbDemo"
import { Divider } from "client/components/Divider/Divider"
import type { ApiRouter } from "server/api"
import { useQuery } from "@tanstack/react-query"

fooBar()

type GetApiRoute = {
	[Key in keyof ApiRouter]: ApiRouter[Key] extends { get: any } ? Key : never
}[keyof ApiRouter]

function useApiQuery<T extends GetApiRoute>(route: T) {
	return useQuery({
		queryKey: [route],
		queryFn: async () => {
			const res = await fetch(route)
			if (!res.ok) {
				throw new Error("Network response was not ok")
			}
			const data = await res.json()
			return data as ApiRouter[T]["get"] extends { response: infer R } ? R : unknown
		},
	})
}

export default function App() {
	const { data } = useApiQuery("/api/hello")
	console.log(data)
	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			<Divider />
			<Grid>
				<Cell>
					<ServiceWorkerDemo />
				</Cell>
				<Cell y={2}>
					<ApiDemo />
				</Cell>
				<Cell x={2}>
					<UserAccountDemo />
				</Cell>
				<Cell>
					<WorkerDemo />
				</Cell>
				<Cell row>
					<DbDemo />
				</Cell>
			</Grid>
		</div>
	)
}
