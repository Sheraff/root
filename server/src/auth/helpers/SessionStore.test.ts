import Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeStore } from "./SessionStore"
import schemaContent from "../schema.sql"

describe("SessionStore", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("stores, retrieves, deletes sessions", () => {
		const db = new Database("")
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
		// write many times to make sure Cache gets filled and when we read "1" it's from the database
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
		store.close()
	})

	it("clears inactive sessions after 1 day", async () => {
		const db = new Database("")
		db.pragma("journal_mode = WAL")
		db.pragma("synchronous = NORMAL")
		db.exec(schemaContent)

		expect(db.open).toBe(true)
		expect(db.memory).toBe(true)

		const store = makeStore(db)

		const session = {
			cookie: {
				originalMaxAge: 1,
			},
			provider: "hello",
		}

		store.set("1", session, () => { })
		const getCallback = vi.fn()
		store.get("1", getCallback)
		expect(getCallback).toHaveBeenCalledOnce()
		expect(getCallback).toHaveBeenCalledWith(null, session)

		expect(vi.getTimerCount()).toBe(1)

		vi.advanceTimersByTime(24 * 60 * 60 * 1_000)
		expect(db.open).toBe(true)
		vi.runAllTicks()

		store.get("1", getCallback)
		expect(getCallback).toHaveBeenCalledTimes(2)
		expect(getCallback).toHaveBeenLastCalledWith(null, null)

		db.close()
	})
})
