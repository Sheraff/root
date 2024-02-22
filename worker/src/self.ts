declare global {
	interface WorkerNavigator {
		connection?: {
			downlink: number
			rtt: number
		}
	}
}

const sw = self as unknown as ServiceWorkerGlobalScope

export { sw }
