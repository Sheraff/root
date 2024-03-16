import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"

export const countries = sqliteTable(
	"countries",
	{
		id: integer("id").primaryKey(),
		name: text("name"),
	},
	(countries) => ({
		nameIdx: uniqueIndex("nameIdx").on(countries.name),
	})
)

export const countriesRelations = relations(countries, ({ many }) => ({
	cities: many(cities),
}))

export const cities = sqliteTable("cities", {
	id: integer("id").primaryKey(),
	name: text("name"),
	countryId: integer("country_id").references(() => countries.id),
})

export const citiesRelations = relations(cities, ({ one }) => ({
	country: one(countries, {
		fields: [cities.countryId],
		references: [countries.id],
	}),
}))
