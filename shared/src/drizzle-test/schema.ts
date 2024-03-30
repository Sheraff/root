import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"

export const countries = sqliteTable(
	"countries",
	{
		id: text("id").primaryKey(),
		name: text("name"),
		population: integer("population"),
	},
	(countries) => ({
		nameIdx: index("nameIdx").on(countries.name),
	})
)

export const countriesRelations = relations(countries, ({ many }) => ({
	cities: many(cities),
}))

export const cities = sqliteTable("cities", {
	id: text("id").primaryKey(),
	name: text("name"),
	countryId: text("country_id").references(() => countries.id),
	population: integer("population"),
})

export const citiesRelations = relations(cities, ({ one }) => ({
	country: one(countries, {
		fields: [cities.countryId],
		references: [countries.id],
	}),
}))
