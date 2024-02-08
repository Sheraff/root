export function readableTime(ms: number) {
	const s = Math.floor(ms / 1000)
	const m = Math.floor(s / 60)
	if (m > 0) return `${m}m ${s % 60}s`
	if (s > 10) return `${s}s`
	return `${ms}ms`
}
