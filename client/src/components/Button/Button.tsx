import { type ComponentProps } from "react"
import classes from "./Button.module.css"
import { clsx } from "clsx"

export function Button({
	dark,
	className,
	...props
}: ComponentProps<"button"> & { dark?: boolean }) {
	return (
		<button
			{...props}
			className={clsx(className, classes.main, {
				[classes.dark]: dark,
			})}
		/>
	)
}
