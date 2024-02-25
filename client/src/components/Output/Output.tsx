import styles from "client/components/Output/Output.module.css"
import clsx from "clsx"
import { useState, useEffect, useRef } from "react"

export function Output({ children }: { children: string | number }) {
	// display "active" state for 1 second after changing children
	const [active, setActive] = useState(false)
	const previous = useRef(children)
	useEffect(() => {
		if (previous.current === children) return
		previous.current = children
		setActive(true)
		const id = setTimeout(() => setActive(false), 1_000)
		return () => clearTimeout(id)
	}, [children])

	return <output className={clsx(styles.output, active && styles.active)}>{children}</output>
}
