import styles from "client/components/Bento/Title.module.css"
import { Divider } from "client/components/Divider/Divider"

export function Title({ icon, title }: { icon: string; title: string }) {
	return (
		<h2 className={styles.h2}>
			<img src={icon} alt="" />
			<Divider vertical />
			{title}
		</h2>
	)
}
