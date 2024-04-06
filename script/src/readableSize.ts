export function readableSize(size: number) {
	const i = Math.min(4, Math.floor(Math.log(size) / Math.log(1024)))
	const unit = ["B", "kB", "MB", "GB", "TB"][i]!
	return (size / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + " " + unit
}
