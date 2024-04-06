import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"

export const list = sqliteTable(
	"list",
	{
		id: text("id").primaryKey(),
		content: text("content"),
		position: text("position"),
	},
	(list) => ({
		positionIdx: index("positionIdx").on(list.position),
	})
)
