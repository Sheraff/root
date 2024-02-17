import { type ComponentProps, type ReactNode } from "react"
import classes from "./Button.module.css"
import { clsx } from "clsx"

export function Button({ className, ...props }: ComponentProps<"button"> | ComponentProps<"a">) {
	const Component = "href" in props ? "a" : "button"
	return <Component {...(props as object)} className={clsx(className, classes.main)} />
}

export function ButtonList({ children }: { children: ReactNode }) {
	return <div className={classes.list}>{children}</div>
}
