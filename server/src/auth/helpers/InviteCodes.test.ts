import Database from "better-sqlite3"
import { describe, expect, it } from "vitest"
import { makeInviteCodes } from "~/auth/helpers/InviteCodes"
import schemaContent from "~/auth/schema.sql"

describe("InviteCodes", () => {
	it("stores, retrieves, deletes sessions", () => {
		const db = new Database(":memory:")
		db.pragma("journal_mode = WAL")
		db.pragma("synchronous = NORMAL")
		db.exec(schemaContent)

		const invitesStore = makeInviteCodes(db)

		const invites = invitesStore.getAll()
		expect(invites).not.toHaveLength(0)

		const foo = invitesStore.validate(invites[0]!.code)
		expect(foo).not.toBeFalsy()

		const newInvites = invitesStore.getAll()

		// validating invite should delete it
		expect(newInvites).not.toContain(invites[0]!)

		// regenerate invites
		expect(newInvites.length).toBe(invites.length)

		invitesStore.close()
		db.close()
	})
})
