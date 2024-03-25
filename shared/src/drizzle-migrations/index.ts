export const migrations = Object.fromEntries(
	Object.entries(
		import.meta.glob("./*.sql", { eager: true, query: "?raw", import: "default" })
	).map(([key, value]) => [key.slice(2, -4), value])
)
