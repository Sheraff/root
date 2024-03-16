import type { PushMessage } from "shared/pushEvents"
import { sw } from "worker/self"

declare global {
	interface NotificationAction {
		/** A string identifying a user action to be displayed on the notification. */
		action: string
		/** A string containing action text to be shown to the user. */
		title: string
		/** A string containing the URL of an icon to display with the action. */
		icon?: string
	}
	interface NotificationOptions {
		/** An array of actions to display in the notification. */
		actions?: NotificationAction[]
	}
}

sw.addEventListener("push", (event) => {
	const data = event.data?.json() as PushMessage
	if (data.type === "ACK") {
		console.log("[SW] push subscription acknowledged by server")
	} else {
		console.error("[SW] unknown push message:", data)
	}
	void sw.registration.showNotification("New push message", {
		data,
		icon: "/vite.svg",
		body: "Click here to act now!",
		actions: [
			{
				action: "act-now",
				title: "Act now!!",
			},
		],
	})
})

sw.addEventListener("notificationclick", (event) => {
	const data = event.notification.data as PushMessage
	console.log("[SW] notification clicked", {
		action: event.action,
		data,
	})
	event.notification.close()
})

// async function registerSync() {
// 	await sw.registration.sync.register("sync")
// }

// sw.addEventListener("sync", function (event) {
// 	if (event.tag == "myFirstSync") {
// 		event.waitUntil(doSomeStuff())
// 	}
// })

// void sw.clients.get("foo").then((client) => {
// 	if (client) {
// 	void sw.clients.openWindow(client.url)
// 	}
// })

// // when receiving a "push" event `type: "SYNC"` from the server (indicating that there is new data to be fetched)
// void sw.clients.matchAll({type: "window", includeUncontrolled: false}).then((clients) => {
// 	for (const client of clients) {
// 		if (client.visibilityState === "visible") {
// 			// if a client is visible, tell it to sync, the SQLite data is shared between all clients
// 			client.postMessage()
// 			return
// 		}
// 	}
// 	// if no client is visible, sync from the service worker, then what?
// })

export async function registerPush() {
	const subscription = await sw.registration.pushManager.getSubscription()
	const url = new URL("/api/push/handshake", location.href)
	if (subscription) {
		console.log("[SW] already subscribed to push notifications")
		const data = subscription.toJSON()
		url.searchParams.set("endpoint", data.endpoint!)
		url.searchParams.set("auth", data.keys!.auth!)
		url.searchParams.set("p256dh", data.keys!.p256dh!)
	} else {
		console.log("[SW] subscribing to push notifications...")
	}
	const pkResponse = await fetch(url)
	if (pkResponse.status === 204) {
		console.log("[SW] push subscription still valid, waiting for server ack...")
		return
	}
	if (pkResponse.status !== 200) {
		throw new Error(`[SW] failed to get push public key: ${pkResponse.status}`)
	}
	const publicKey = await pkResponse.text()
	if (subscription) {
		console.log("[SW] updating subscription to push notifications...")
		await subscription.unsubscribe()
	}
	const newSubscription = await sw.registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: publicKey,
	})
	const postResponse = await fetch("/api/push/handshake", {
		method: "POST",
		body: JSON.stringify(newSubscription.toJSON()),
	})
	if (postResponse.status === 200) {
		console.log("[SW] push subscription sent to server, waiting for server ack...")
	} else {
		throw new Error(`[SW] failed to send push subscription to server: ${postResponse.status}`)
	}
}
