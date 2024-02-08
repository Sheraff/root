import { useEffect, useState } from "react"

export function ApiDemo() {
	const [protectedRes, setProtectedRes] = useState<unknown>()
	useEffect(() => {
		fetch("/api/protected")
			.then((res) => res.json())
			.then(setProtectedRes)
			.catch((e) => {
				console.error(e)
				setProtectedRes({ error: String(e) })
			})
	}, [])

	const [openRes, setOpenRes] = useState<unknown>()
	useEffect(() => {
		fetch("/api/hello")
			.then((res) => res.json())
			.then(setOpenRes)
			.catch((e) => {
				console.error(e)
				setOpenRes({ error: String(e) })
			})
	}, [])

	return (
		<>
			<h2>Open</h2>
			<pre>{openRes ? JSON.stringify(openRes, null, 2) : " \n  loading\n "}</pre>
			<h2>Protected</h2>
			<pre>{protectedRes ? JSON.stringify(protectedRes, null, 2) : " \n  loading\n "}</pre>
		</>
	)
}
