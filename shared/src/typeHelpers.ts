export type NoInfer<T> = [T][T extends any ? 0 : never]

export type Prettify<T> = {
	[K in keyof T]: T[K]
} & {} // eslint-disable-line @typescript-eslint/ban-types -- sometimes this is really what we need

export type StringAsNumber<T extends string> = T extends `${infer N extends number}` ? N : never
