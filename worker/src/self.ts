interface SyncManager {
	getTags(): Promise<string[]>
	register(tag: string): Promise<void>
}

declare global {
	interface WorkerNavigator {
		connection?: {
			downlink: number
			rtt: number
		}
	}

	// See https://github.com/GoogleChrome/workbox/issues/2946
	interface ServiceWorkerRegistration {
		readonly sync: SyncManager
	}

	interface SyncEvent extends ExtendableEvent {
		readonly lastChance: boolean
		readonly tag: string
	}

	interface ServiceWorkerGlobalScopeEventMap {
		sync: SyncEvent
	}
}

const sw = self as unknown as ServiceWorkerGlobalScope

export { sw }
