type Ack = {
	type: "ACK"
	payload?: never
}

type Foo = {
	type: "FOO"
	payload: {
		foo: string
	}
}

export type PushMessage = Ack | Foo
