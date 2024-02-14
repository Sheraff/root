import { Cell, Grid } from "client/components/Bento/GridCell"
import { ApiDemo } from "client/components/ApiDemo"
import { Divider } from "client/components/Divider/Divider"

export default function App() {
	return (
		<div>
			<h1>Welcome to our Fullstack TypeScript Project!</h1>
			<Divider />
			<Grid>
				<Cell y={2}>
					<ApiDemo />
				</Cell>
			</Grid>
		</div>
	)
}
