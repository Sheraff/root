import { type ComponentProps, type ReactNode } from "react"
import styles from "client/components/Button/Button.module.css"
import { clsx } from "clsx"

export function Button({ className, ...props }: ComponentProps<"button"> | ComponentProps<"a">) {
	const Component = "href" in props ? "a" : "button"
	return <Component {...(props as object)} className={clsx(className, styles.main)} />
}

export function ButtonList({ children }: { children: ReactNode }) {
	return <div className={styles.list}>{children}</div>
}
