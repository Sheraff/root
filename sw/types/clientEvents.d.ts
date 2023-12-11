import type { Message } from "@shared/workerEvents"

declare global {
	interface ExtendableMessageEvent extends ExtendableEvent {
		readonly data: Message
	}
}
