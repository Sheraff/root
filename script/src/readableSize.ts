export function readableSize(size: number) {
	const i = Math.floor(Math.log(size) / Math.log(1024))
	return (
		(size / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + " " + ["B", "kB", "MB", "GB", "TB"][i]
	)
}
