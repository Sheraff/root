import { fooBar } from "shared/foo/bar"
import { ServiceWorkerDemo } from "client/components/ServiceWorkerDemo"
import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { UserAccountDemo } from "client/components/UserAccountDemo"
import { WorkerDemo } from "client/components/WorkerDemo"
import { DbDemo } from "client/components/DbDemo"

fooBar()








const a = "hello"


export default function App() {
	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			<hr />
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
				<Cell y={2} x={2}>
					<DbDemo />
				</Cell>
			</Grid>
		</div>
	)
}
