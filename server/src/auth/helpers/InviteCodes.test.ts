import Database from "better-sqlite3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makeInviteCodes } from "./InviteCodes"
import schemaContent from "../schema.sql"

describe.concurrent("InviteCodes", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})
	it("stores, retrieves, deletes codes", () => {
		// setup
		const db = new Database("")
		db.pragma("journal_mode = WAL")
		db.pragma("synchronous = NORMAL")
		db.exec(schemaContent)
		const invitesStore = makeInviteCodes(db)

		// test
		const invites = invitesStore.getAll()
		expect(invites).not.toHaveLength(0)

		const foo = invitesStore.validate(invites[0]!.code)
		expect(foo).not.toBeFalsy()

		const newInvites = invitesStore.getAll().map((i) => i.code)

		// validating invite should delete it
		expect(newInvites).not.toContain(invites[0]!.code)

		// regenerated invites
		expect(newInvites.length).toBe(invites.length)

		// cleanup
		invitesStore.close()
		db.close()
	})
	it("renews codes after they expire", () => {
		// setup
		const db = new Database("")
		db.pragma("journal_mode = WAL")
		db.pragma("synchronous = NORMAL")
		db.exec(schemaContent)
		const invitesStore = makeInviteCodes(db)

		// test
		const invites = invitesStore.getAll()
		expect(invites).not.toHaveLength(0)

		expect(vi.getTimerCount()).toBe(1)

		const expiry = 24 * 60 * 60 * 1_000
		vi.setSystemTime(Date.now() + expiry)
		vi.advanceTimersByTime(expiry)

		expect(vi.getTimerCount()).toBe(1)

		const newInvites = invitesStore.getAll().map((i) => i.code)

		// after expiry time, all invites should be deleted
		for (const invite of invites) {
			expect(newInvites).not.toContain(invite.code)
		}

		// regenerated invites
		expect(newInvites.length).toBe(invites.length)

		// cleanup
		invitesStore.close()
		db.close()
	})
})
