import { fooBar } from "@shared/foo/bar"

export function helloWorld() {
	console.log("helloWorld")
	fooBar()
	return "helloWorld"
}
