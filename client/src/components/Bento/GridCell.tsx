import type { CSSProperties, ReactNode } from "react"
import styles from "client/components/Bento/GridCell.module.css"
import clsx from "clsx"

export function Grid({ children }: { children: ReactNode }) {
	return <div className={styles.grid}>{children}</div>
}

export function Cell({
	children,
	x = 1,
	y = 1,
	row,
}: {
	children: ReactNode
	x?: number
	y?: number
	row?: boolean
}) {
	return (
		<div
			className={clsx(styles.cell, row && styles.row)}
			style={
				{
					"--x": x,
					"--y": y,
				} as CSSProperties
			}
		>
			<div className={styles.bg} />
			{children}
		</div>
	)
}
