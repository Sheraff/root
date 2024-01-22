type FooEvent = {
	type: "FOO"
	payload: {
		foo: string
	}
}

export type Message = FooEvent
