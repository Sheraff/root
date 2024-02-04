import type { CSSProperties, ReactNode } from "react"
import classes from "./GridCell.module.css"

export function Grid({ children }: { children: ReactNode }) {
	return <div className={classes.grid}>{children}</div>
}

export function Cell({ children, x = 1, y = 1 }: { children: ReactNode; x?: number; y?: number }) {
	return (
		<div
			className={classes.cell}
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
