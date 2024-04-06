import { onlineManager } from "@tanstack/react-query"
import { schema } from "assets/drizzle-test"
import { useAuthContext } from "client/auth/useAuthContext"
import { Title } from "client/components/Bento/Title"
import { Button, ButtonList } from "client/components/Button/Button"
import { Divider } from "client/components/Divider/Divider"
import { Output } from "client/components/Output/Output"
import { useDb } from "client/db/DbProvider"
import { useSync } from "client/db/Sync"
import { useDbMutation } from "client/db/useDbMutation"
import { useDbQuery } from "client/db/useDbQuery"
import { desc, sql } from "drizzle-orm"
import { useEffect, useState } from "react"
// import { sql } from "shared/sql"

export function DbDemo() {
	const auth = useAuthContext()
	const [flag, setFlag] = useState(false)
	if (auth.type !== "signed-in") {
		return <p>User DB only available to signed-in users</p>
	}
	return (
		<>
			<Title
				icon="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWRhdGFiYXNlIj48ZWxsaXBzZSBjeD0iMTIiIGN5PSI1IiByeD0iOSIgcnk9IjMiLz48cGF0aCBkPSJNMyA1VjE5QTkgMyAwIDAgMCAyMSAxOVY1Ii8+PHBhdGggZD0iTTMgMTJBOSAzIDAgMCAwIDIxIDEyIi8+PC9zdmc+"
				title="Database"
			/>
			<Divider full />
			<Button onClick={() => setFlag(!flag)}>Toggle</Button>
			{flag && <Content name={auth.userId} />}
		</>
	)
}

function Content({ name }: { name: string }) {
	const ctx = useDb<typeof schema>(name)
	// const sync = useSync(ctx?.db, name)

	// // Sync with server on reconnect
	// useEffect(() => {
	// 	if (!sync) return
	// 	if (navigator.onLine) {
	// 		void sync.roundTrip()
	// 	}
	// 	return onlineManager.subscribe((online) => {
	// 		if (online) {
	// 			void sync.roundTrip()
	// 		}
	// 	})
	// }, [sync])

	const list = useDbQuery(
		ctx?.db.select().from(schema.list).orderBy(desc(schema.list.position), schema.list.id)
	)

	console.log("list", list.data)

	useEffect(() => {
		console.log("------cocococococ-------------")
		const insert = ctx?.db.insert(schema.list).values({
			id: sql.placeholder("id"),
			content: sql.placeholder("content"),
			position: sql.placeholder("position"),
		})
		console.log(insert)
		const insert2 = ctx?.db
			.insert(schema.list)
			.values({
				id: sql.placeholder("id"),
				content: sql.placeholder("content"),
				position: sql.placeholder("position"),
			})
			.returning({ id: schema.list.id })
		console.log(insert2)
		// insert.config.returning
	}, [ctx?.db])

	// const { mutate: insertData } = useDbMutation<[id: string, content: string, position: number]>({
	// 	dbName: name,
	// 	query: sql`INSERT INTO test (id, content, position) VALUES (?, ?, ?) RETURNING id, content;`,
	// 	// onSuccess: () => sync?.roundTrip(),
	// })

	// const { mutate: dropData } = useDbMutation({
	// 	dbName: name,
	// 	query: sql`DELETE FROM test;`,
	// 	// onSuccess: () => sync?.roundTrip(),
	// })

	return (
		<>
			<Output>{JSON.stringify(list.data ?? [], null, 2)}</Output>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const content = (event.currentTarget.content as HTMLInputElement).value
					// insertData([crypto.randomUUID(), content, 1])
					event.currentTarget.reset()
				}}
			>
				<ButtonList>
					<input
						type="text"
						name="content"
						required
						placeholder="New item..."
						autoComplete="off"
					/>
					<Button type="submit">Add to list</Button>
					<Button
						type="button"
						// onClick={() => dropData([])}
					>
						Clear list
					</Button>
				</ButtonList>
			</form>
		</>
	)
}
