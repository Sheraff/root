import clsx from "clsx"
import classes from "./Divider.module.css"

export function Divider(props: { accent?: boolean; full?: boolean }) {
	return (
		<hr
			className={clsx(
				classes.divider,
				props.accent && classes.accent,
				props.full && classes.full
			)}
		/>
	)
}
