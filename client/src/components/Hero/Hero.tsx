import styles from "client/components/Hero/Hero.module.css"

export function Hero() {
	return (
		<div className={styles.hero}>
			<div className={styles.title}>
				<div>
					<h1>🌳</h1>
					<h1>Root</h1>
					<p>Offline-first fullstack type-safe SQL framework</p>
				</div>
			</div>
			<div className={styles.neon}>
				<div className={styles.spotlight}></div>
			</div>
			<div className={styles.brands}>
				<a className={styles.item} href="https://vitejs.dev">
					<img src="/vite.svg" alt="Vite Logo" />
				</a>
				<a className={styles.item} href="https://reactjs.org">
					<img src="/react.svg" alt="React Logo" />
				</a>
				<a className={styles.item} href="https://vlcn.io">
					<img src="/vlcn.png" alt="Vulcan Logo" />
				</a>
			</div>
		</div>
	)
}
