import Database from "better-sqlite3"
import { describe, expect, it, vi } from "vitest"
import { makeStore } from "~/auth/helpers/SessionStore"
import schemaContent from "~/auth/schema.sql"

describe("SessionStore", () => {
	it("stores, retrieves, deletes sessions", () => {
		const db = new Database(":memory:")
		db.pragma("journal_mode = WAL")
		db.pragma("synchronous = NORMAL")
		db.exec(schemaContent)

		const store = makeStore(db)

		const session = {
			cookie: {
				originalMaxAge: 1,
			},
			provider: "hello",
		}

		const setCallback = vi.fn()
		for (let i = 1; i < 12; i++) {
			store.set(`${i}`, session, setCallback)
			expect(setCallback).toHaveBeenLastCalledWith()
		}
		expect(setCallback).toHaveBeenCalledTimes(11)

		const getCallback = vi.fn()
		store.get("1", getCallback)
		expect(getCallback).toHaveBeenCalledOnce()
		expect(getCallback).toHaveBeenCalledWith(null, session)

		const destroyCallback = vi.fn()
		store.destroy("1", destroyCallback)
		expect(destroyCallback).toHaveBeenCalledOnce()
		expect(destroyCallback).toHaveBeenCalledWith()

		db.close()
	})
})
