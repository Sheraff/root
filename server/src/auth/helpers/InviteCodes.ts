import { sql } from "shared/sql"
import type BetterSqlite3 from "better-sqlite3"
import wordList from "./5-letter-words.txt"

const WORDS = wordList.split("\n")
const CODE_LENGTH = 3
const CODE_EXPIRY = 24 * 60 * 60 * 1000
const FREE_INVITES = 5

function generateCode(existingCodes: string[]) {
	const count = WORDS.length
	while (true) {
		const indices: number[] = []
		while (indices.length < CODE_LENGTH) {
			const index = Math.floor(Math.random() * count)
			if (indices.includes(index)) continue
			indices.push(index)
		}
		const code = indices.map((i) => WORDS[i]).join(" ")
		if (existingCodes.includes(code)) continue
		return code
	}
}

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest
	it("words", () => {
		expect(WORDS.length).toBeGreaterThan(4000)
	})
	it("generateCode", () => {
		const code = generateCode([])
		expect(code).not.toBeUndefined()
		const arr = [code]
		for (let i = 0; i < 100; i++) {
			const code = generateCode(arr)
			expect(code).not.toBeUndefined()
			arr.push(code)
		}
	})
}

function fillInvites(invites: Invite[], insert: (invite: Invite) => void) {
	const delta = FREE_INVITES - invites.length
	if (delta <= 0) return

	const codes = invites.map((i) => i.code)
	for (let i = 0; i < delta; i++) {
		const code = generateCode(codes)
		const created_at = new Date().toISOString()
		const expires_at = new Date(Date.now() + CODE_EXPIRY).toISOString()
		const invite = { code, created_at, expires_at }
		insert(invite)
		invites.push(invite)
		codes.push(code)
	}
}

type Invite = {
	code: string
	created_at: string
	expires_at: string
}

export function makeInviteCodes(db: BetterSqlite3.Database) {
	const getAllStatement = db.prepare(sql`SELECT * FROM invites`)

	const deleteExpiredStatement = db.prepare<{
		now: string
	}>(sql`DELETE FROM invites WHERE datetime(@now) > datetime(expires_at)`)

	const deleteReturnStatement = db.prepare<{
		code: string
	}>(sql`DELETE FROM invites WHERE code = @code RETURNING *`)

	const insertStatement = db.prepare<{
		code: string
		created_at: string
		expires_at: string
	}>(sql`INSERT INTO invites VALUES (@code, @created_at, @expires_at)`)

	/*
	 * 1. Delete all codes that are expired
	 * 2. Generate new codes until there are N free codes (free code means not linked to a user) (codes are valid for 1 day)
	 * 3. Create timeout to repeat steps 1-2 just before the first code expires
	 *
	 * 4. Expose function to validate a code
	 * 	4.1. call deleteReturnStatement with the code
	 * 	4.2. if the statement returns a row, the code is valid
	 * 		4.2.1. clear the timeout
	 * 		4.2.2. repeat steps 1-3
	 */

	let timeout: NodeJS.Timeout | null = null
	function cleanAndFill() {
		if (timeout) clearTimeout(timeout)
		deleteExpiredStatement.run({ now: new Date().toISOString() })
		const invites = getAllStatement.all() as Invite[]
		fillInvites(invites, insertStatement.run)
		const minExpiresAt = invites.reduce(
			(min, i) => (i.expires_at < min ? i.expires_at : min),
			invites[0]!.expires_at
		)
		timeout = setTimeout(cleanAndFill, new Date(minExpiresAt).getTime() - Date.now())
	}

	cleanAndFill()

	return {
		validate(code: string) {
			const res = deleteReturnStatement.get({ code }) as Invite | undefined
			if (!res) return false
			cleanAndFill()
			return res
		},
		getAll() {
			return getAllStatement.all() as Invite[]
		},
		close() {
			if (timeout) clearTimeout(timeout)
		},
	}
}
