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

export type Message = Ack | Foo
