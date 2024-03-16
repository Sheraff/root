import WebPush, { type PushSubscription, type VapidKeys } from "web-push"
import type { PushMessage } from "shared/pushEvents"
import { authProtected } from "server/auth/helpers/onRequestAuthProtected"
import type { FastifyInstance, FastifyRequest } from "fastify"
import { sql } from "shared/sql"
import schemaContent from "./schema.sql"

declare module "fastify" {
	interface FastifyInstance {
		notify: (userId: string, message: PushMessage) => void
	}
}

function push(fastify: FastifyInstance, _: object, done: () => void) {
	const authDB = fastify.auth.db
	authDB.exec(schemaContent)

	const keyValSelect = authDB.prepare<{
		key: string
	}>(sql`SELECT value FROM key_values WHERE key = @key`)

	const keyValInsert = authDB.prepare<{
		key: string
		value: string
	}>(sql`INSERT OR REPLACE INTO key_values VALUES (@key, @value)`)

	const KeyVal = {
		get(key: string) {
			const result = keyValSelect.get({ key }) as { value: string } | undefined
			return result?.value
		},
		set(key: string, value: string) {
			keyValInsert.run({ key, value })
		},
	}

	function getVapidKeys(): VapidKeys {
		stored: {
			const publicKey = KeyVal.get("vapid_public_key")
			if (!publicKey) break stored
			const privateKey = KeyVal.get("vapid_private_key")
			if (!privateKey) break stored
			fastify.log.info(`Using stored VAPID keys, public key: ${publicKey}`)
			return {
				publicKey,
				privateKey,
			}
		}
		const vapidKeys = WebPush.generateVAPIDKeys()
		KeyVal.set("vapid_public_key", vapidKeys.publicKey)
		KeyVal.set("vapid_private_key", vapidKeys.privateKey)
		fastify.log.info(`Generated new VAPID keys, public key: ${vapidKeys.publicKey}`)

		// old subscriptions cannot work anymore, delete them
		authDB.exec(sql`DELETE FROM push_subscriptions`)
		const deleted = authDB.prepare(sql`SELECT changes() as count`).get() as { count: number }
		if (deleted.count) {
			fastify.log.info(`Deleted ${deleted.count} push subscriptions using the old VAPID keys`)
		}

		return vapidKeys
	}

	const vapidKeys = getVapidKeys()

	WebPush.setVapidDetails(
		// must be a mailto: or https: URL
		"mailto:foo.foo@foo.com",
		vapidKeys.publicKey,
		vapidKeys.privateKey
	)

	type SubscriptionRecord = {
		subscriptionId: string
		userId: string
		endpoint: string
		p256dh: string
		auth: string
	}

	function recordToSubscription(record: SubscriptionRecord): PushSubscription {
		return {
			endpoint: record.endpoint,
			keys: {
				p256dh: record.p256dh,
				auth: record.auth,
			},
		}
	}

	const insertSubscription = authDB.prepare<SubscriptionRecord>(
		sql`INSERT OR IGNORE INTO push_subscriptions VALUES (@subscriptionId, @userId, @endpoint, @p256dh, @auth, datetime('now'))`
	)

	const selectSubscription = authDB.prepare<{
		userId: string
	}>(sql`SELECT * FROM push_subscriptions WHERE user_id = @userId`)

	function sendAck(sub: PushSubscription, req: FastifyRequest) {
		const message: PushMessage = { type: "ACK" }
		fastify.log.info({ reqId: req.id, sub }, `Sending ACK Push`)
		void WebPush.sendNotification(sub, JSON.stringify(message)).then((res) => {
			fastify.log.info({ reqId: req.id, res }, `Sent ACK Push`)
		})
	}

	fastify.get("/api/push/handshake", {
		schema: {
			querystring: {
				type: "object",
				properties: {
					endpoint: { type: "string" },
					auth: { type: "string" },
					p256dh: { type: "string" },
				},
			},
			response: {
				401: authProtected[401],
				200: {
					type: "string",
				},
				204: {},
			},
		},
		onRequest: authProtected.onRequest,
		handler(req, reply) {
			const query = req.query as Partial<SubscriptionRecord> | undefined
			if (query?.endpoint && query?.auth && query?.p256dh) {
				const subscription = selectSubscription.all({
					userId: req.session.user!.id,
				}) as SubscriptionRecord[]
				const match = subscription.find(
					(sub) =>
						sub.endpoint === query.endpoint &&
						sub.auth === query.auth &&
						sub.p256dh === query.p256dh
				)
				if (match) {
					void reply.status(204).send()
					sendAck(recordToSubscription(match), req)
					return
				}
			}
			void reply.send(vapidKeys.publicKey)
		},
	})

	fastify.post("/api/push/handshake", {
		schema: {
			body: {
				type: "string",
			},
			response: {
				401: authProtected[401],
			},
		},
		onRequest: authProtected.onRequest,
		handler(req, reply) {
			const subscription = JSON.parse(req.body as string) as PushSubscription
			insertSubscription.run({
				subscriptionId: crypto.randomUUID(),
				userId: req.session.user!.id,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
			})
			req.log.warn(subscription)
			void reply.status(200).send()
			sendAck(subscription, req)
		},
	})

	fastify.decorate("notify", (userId: string, message: PushMessage) => {
		const subscriptions = selectSubscription.all({ userId }) as SubscriptionRecord[]
		for (const sub of subscriptions) {
			void WebPush.sendNotification(recordToSubscription(sub), JSON.stringify(message))
		}
	})

	done()
}

export default Object.assign(push, {
	/**
	 * this makes the decorators added in this plugin (notify, etc.)
	 * persist outside of the scope of this plugin.
	 * This makes other plugins able to send notifications.
	 *
	 * @see {@link https://fastify.dev/docs/latest/Reference/Plugins#handle-the-scope}
	 */
	[Symbol.for("skip-override")]: true,
})
