import styles from "client/components/Output/Output.module.css"
import type { ReactNode } from "react"

export function Output({ children }: { children: ReactNode }) {
	return <output className={styles.output}>{children}</output>
}
