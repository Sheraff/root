import { fooBar } from "shared/foo/bar"
import { ServiceWorkerDemo } from "client/components/ServiceWorkerDemo"
import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { UserAccountDemo } from "client/components/UserAccountDemo"
import { WorkerDemo } from "client/components/WorkerDemo"
import { DbDemo } from "client/components/DbDemo"
import { ReadTheDocs } from "client/components/ReadTheDocs"
import { Header } from "client/components/Header/Header"
import styles from "client/App.module.css"

fooBar()

export default function App() {
	return (
		<main className={styles.main}>
			<Header>
				<h1>🌳 Root</h1>
				<ReadTheDocs />
			</Header>
			<Grid>
				<Cell>
					<ServiceWorkerDemo />
				</Cell>
				<Cell x={2}>
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
		</main>
	)
}
