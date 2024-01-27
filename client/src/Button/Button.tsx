import { type ComponentProps } from "react"
import classes from "./Button.module.css"

export function Button(props: ComponentProps<"button">) {
	return <button {...props} className={classes.main} />
}
