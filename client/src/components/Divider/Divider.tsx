import styles from "client/components/Divider/Divider.module.css"
import clsx from "clsx"

export function Divider(props: { accent?: boolean; full?: boolean }) {
	return (
		<hr
			className={clsx(
				styles.divider,
				props.accent && styles.accent,
				props.full && styles.full
			)}
		/>
	)
}
