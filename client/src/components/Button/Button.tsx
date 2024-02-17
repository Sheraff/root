import { type ComponentProps } from "react"
import classes from "./Button.module.css"
import { clsx } from "clsx"

export function Button({
	dark,
	className,
	...props
}: (ComponentProps<"button"> | ComponentProps<"a">) & { dark?: boolean }) {
	const Component = "href" in props ? "a" : "button"
	return (
		<Component
			{...(props as object)}
			className={clsx(className, classes.main, {
				[classes.dark]: dark,
			})}
		/>
	)
}
