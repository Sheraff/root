import { fooBar } from "shared/foo/bar"
import { ServiceWorkerDemo } from "client/components/ServiceWorkerDemo"
import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { UserAccountDemo } from "client/components/UserAccountDemo"
import { WorkerDemo } from "client/components/WorkerDemo"
import { DbDemo } from "client/components/DbDemo"
import { Divider } from "client/components/Divider/Divider"
import { api } from "client/api/router"

fooBar()

export default function App() {
	const { data } = api.nested.foo.get.query()
	console.log(data)
	// console.log(api.hello.get.query)
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
