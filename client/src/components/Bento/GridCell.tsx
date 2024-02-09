import type { CSSProperties, ReactNode } from "react"
import classes from "./GridCell.module.css"
import clsx from "clsx"

export function Grid({ children }: { children: ReactNode }) {
	return <div className={classes.grid}>{children}</div>
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
			className={clsx(classes.cell, row && classes.row)}
			style={
				{
					"--x": x,
					"--y": y,
				} as CSSProperties
			}
		>
			{children}
		</div>
	)
}
