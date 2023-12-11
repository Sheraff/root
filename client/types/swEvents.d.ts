import type { Message } from "shared/workerEvents"

declare global {
	interface ServiceWorker extends EventTarget, AbstractWorker {
		postMessage(message: Message): void
	}
}
