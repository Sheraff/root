import type { ReactNode } from "react"
import styles from "client/components/Header/Header.module.css"

export function Header({ children }: { children: ReactNode }) {
	return (
		<header className={styles.header}>
			<nav>{children}</nav>
		</header>
	)
}
