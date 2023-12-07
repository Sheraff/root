import { type SessionStore } from "@fastify/session"
import { sql } from "@shared/sql"
import type BetterSqlite3 from "better-sqlite3"
import { Grant } from "~/auth"
import * as Twitch from "~/auth/twitch"

// 1d = 86400s = 86400000ms
const oneDay = 86400000

// 15m = 900s = 900000ms
const clearExpiredInterval = 900000

type Entry = {
	id: string
	session: string
	expires_at: string
	provider: string | null
	provider_user_id: string | null
	provider_email: string | null
	created_at: string
}

function getLinkFromGrant(grant: Grant) {
	switch (grant.provider) {
		case "twitch":
			return Twitch.getIdFromGrant(grant.response)
		default: {
			console.log(`Unknown provider: ${grant.provider}`)
		}
	}
}

export function makeStore(db: BetterSqlite3.Database): SessionStore {
	const clearStatement = db.prepare(
		sql`
			DELETE FROM sessions
			WHERE datetime('now') > datetime(expires_at)`,
	)
	const destroyStatement = db.prepare<{
		id: string
	}>(
		sql`
			DELETE FROM sessions
			WHERE id = @id`,
	)
	const setStatement = db.prepare<Entry>(
		sql`
			INSERT OR REPLACE INTO sessions
			VALUES (@id, @session, @expires_at, @provider, @provider_user_id, @provider_email, @created_at)`,
	)
	const getStatement = db.prepare<{
		id: string
	}>(
		sql`
			SELECT session
			FROM sessions
			WHERE id = @id AND datetime('now') < datetime(expires_at)`,
	)

	setInterval(() => {
		try {
			clearStatement.run()
		} catch (err) {
			console.error(err)
		}
	}, clearExpiredInterval)

	return {
		async set(sessionId, session, callback) {
			if (!session.grant) return callback()
			try {
				const link = getLinkFromGrant(session.grant) ?? { provider: null, id: null, email: null }
				const age = session.cookie.maxAge ?? oneDay
				const now = new Date()
				const expires_at = new Date(now.getTime() + age).toISOString()
				const entry = {
					id: sessionId,
					session: JSON.stringify(session),
					expires_at,
					created_at: now.toISOString(),
					provider: link.provider,
					provider_user_id: link.id,
					provider_email: link.email,
				}
				setStatement.run(entry)
				callback()
			} catch (err) {
				callback(err)
			}
		},
		async get(sessionId, callback) {
			try {
				const res = getStatement.get({ id: sessionId }) as Entry | undefined
				if (res?.session) {
					callback(null, JSON.parse(res.session))
				} else {
					callback(null, null)
				}
			} catch (err) {
				callback(err)
			}
		},
		async destroy(sessionId, callback) {
			try {
				destroyStatement.run({ id: sessionId })
				callback()
			} catch (err) {
				callback(err)
			}
		},
	}
}
