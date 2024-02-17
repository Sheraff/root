import type { ReactNode } from "react"
import classes from "./Header.module.css"

export function Header({ children }: { children: ReactNode }) {
	return (
		<header className={classes.header}>
			<nav>{children}</nav>
		</header>
	)
}
