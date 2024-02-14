import { fooBar } from "shared/foo/bar"
import { ServiceWorkerDemo } from "client/components/ServiceWorkerDemo"
import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { UserAccountDemo } from "client/components/UserAccountDemo"
import { WorkerDemo } from "client/components/WorkerDemo"
import { DbDemo } from "client/components/DbDemo"
import { Divider } from "client/components/Divider/Divider"
import { Vlcn } from "client/components/Brands/Vlcn"
import { Esbuild } from "client/components/Brands/Esbuild"
import { Fastify } from "client/components/Brands/Fastify"
import { TanstackQuery } from "client/components/Brands/TanstackQuery"
import { Vite } from "client/components/Brands/Vite"
import { Vitest } from "client/components/Brands/Vitest"
import { React } from "client/components/Brands/React"
import { Turbo } from "client/components/Brands/Turbo"
import { Valibot } from "client/components/Brands/Valibot"
import { Knip } from "client/components/Brands/Knip"
import { Github } from "client/components/Brands/Github"
import { CssModules } from "client/components/Brands/CssModules"

fooBar()

export default function App() {
	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			<Divider />
			<Grid>
				<Cell>
					<ServiceWorkerDemo />
				</Cell>
				<Cell y={2} x={2}>
					<ApiDemo />
				</Cell>
				<Cell x={2}>
					<UserAccountDemo />
				</Cell>
				<Cell>
					<Vlcn />
				</Cell>
				<Cell>
					<Esbuild />
				</Cell>
				<Cell>
					<Fastify />
				</Cell>
				<Cell>
					<TanstackQuery />
				</Cell>
				<Cell>
					<Vite />
				</Cell>
				<Cell>
					<Vitest />
				</Cell>
				<Cell>
					<React />
				</Cell>
				<Cell>
					<Turbo />
				</Cell>
				<Cell>
					<Valibot />
				</Cell>
				<Cell>
					<Knip />
				</Cell>
				<Cell>
					<Github />
				</Cell>
				<Cell>
					<CssModules />
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
