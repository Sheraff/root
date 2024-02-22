import type { Message } from "shared/pushEvents"
import { sw } from "worker/self"

sw.addEventListener("push", (event) => {
	const data = event.data?.json() as Message
	if (data.type === "ACK") {
		console.log("[SW] push subscription acknowledged by server")
	} else {
		console.error("[SW] unknown push message:", data)
	}
})

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
