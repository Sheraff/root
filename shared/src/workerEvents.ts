type FooEvent = {
	type: "FOO"
	payload: {
		foo: string
	}
}

type UpdateEvent = {
	type: "UPDATE"
	payload?: never
}

type HMREvent = {
	type: "HMR"
	payload?: never
}

type SubscribeEvent = {
	type: "SUBSCRIBE"
	payload?: never
}

export type Message = FooEvent | UpdateEvent | HMREvent | SubscribeEvent
