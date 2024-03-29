import { type SessionStore } from "@fastify/session"
import { sql } from "shared/sql"
import type BetterSqlite3 from "better-sqlite3"
import { type Session } from "fastify"

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

class Cache<T> {
	private map = new Map<string, T>()
	private order: string[] = []

	size: number
	constructor(size: number) {
		this.size = size
	}

	get(key: string): T | undefined {
		return this.map.get(key)
	}

	set(key: string, value: T) {
		this.map.set(key, value)
		this.order.push(key)
		if (this.order.length > 10) {
			const oldest = this.order.shift()!
			this.map.delete(oldest)
		}
	}

	delete(key: string) {
		if (!this.map.has(key)) return
		this.map.delete(key)
		const index = this.order.indexOf(key)
		if (index >= 0) this.order.splice(index, 1)
	}
}

export function makeStore(db: BetterSqlite3.Database): SessionStore & {
	close(): void
} {
	const clearStatement = db.prepare<{
		now: string
	}>(sql`DELETE FROM sessions WHERE @now > datetime(expires_at) RETURNING id`)

	const destroyStatement = db.prepare<{
		id: string
	}>(sql`DELETE FROM sessions WHERE id = @id`)

	const setStatement = db.prepare<Entry>(
		sql`INSERT OR REPLACE INTO sessions VALUES (
			@id, @session, @expires_at, @provider, @provider_user_id, @provider_email, @created_at
		)`
	)

	const getStatement = db.prepare<{
		id: string
	}>(sql`SELECT session FROM sessions WHERE id = @id AND datetime('now') < datetime(expires_at)`)

	const expiredIntervalId = setInterval(() => {
		try {
			const ids = clearStatement.all({
				now: new Date().toISOString(),
			}) as Array<{ id: string }>
			for (const { id } of ids) getCache.delete(id)
		} catch (err) {
			console.error(err)
		}
	}, clearExpiredInterval)

	const getCache = new Cache<Session>(10)

	return {
		close() {
			clearInterval(expiredIntervalId)
		},
		set(sessionId, session, callback) {
			try {
				const age = session.cookie.maxAge ?? oneDay
				const now = new Date()
				const expires_at = new Date(now.getTime() + age).toISOString()
				const entry = {
					id: sessionId,
					session: JSON.stringify(session),
					expires_at,
					created_at: now.toISOString(),
					provider: session.provider ?? null,
					provider_user_id: session.provider_user_id ?? null,
					provider_email: session.provider_email ?? null,
				}
				setStatement.run(entry)
				getCache.set(sessionId, session)
				callback()
			} catch (err) {
				callback(err)
			}
		},
		get(sessionId, callback) {
			const cached = getCache.get(sessionId)
			if (cached) return callback(null, cached)
			try {
				const res = getStatement.get({ id: sessionId }) as Entry | undefined
				if (res?.session) {
					const session = JSON.parse(res.session) as Session
					callback(null, session)
					getCache.set(sessionId, session)
				} else {
					callback(null, null)
				}
			} catch (err) {
				callback(err)
			}
		},
		destroy(sessionId, callback) {
			try {
				destroyStatement.run({ id: sessionId })
				getCache.delete(sessionId)
				callback()
			} catch (err) {
				callback(err)
			}
		},
	}
}
