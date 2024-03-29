/**
 * @example
 * ```ts
 * replaceParams("/api/hello/:id", { id: "yoo" }) // "/api/hello/yoo"
 * ```
 * @example
 * ```ts
 * replaceParams("/example/near/:lat-:lng/radius/:r", { lat: "15°N", lng: "30°E", r: "20" }) // "/example/near/15°N-30°E/radius/20"
 * ```
 */
export function replaceParams(url: string, data: Record<string, unknown>) {
	const parts = url.split("/")
	for (let i = 0; i < parts.length; i++) {
		let part = parts[i]!
		if (part === "") continue
		const re = /:(\w+)/g
		const matches = part.matchAll(re)
		let offset = 0
		for (const match of matches) {
			const index = match.index + offset
			if (index > 0 && part[index - 1] === ":") {
				// ignore double colon
				part = part.substring(0, index - 1) + part.substring(index)
				offset -= 1
				continue
			}
			const found = match[0]
			const key = match[1]!
			if (!(key in data)) {
				if (
					i === parts.length - 1 &&
					part[index + found.length] === "?" &&
					index + found.length === part.length - 1
				) {
					part = part.substring(0, index) // remove optional param
					continue // allow optional param
				} else {
					throw new Error(`No value for key ${key}`)
				}
			}
			const value = data[key]
			const str = String(value)
			let cutLength = found.length
			if (i === parts.length - 1 && part[index + found.length] === "?") {
				cutLength += 1
			}
			part = part.substring(0, index) + str + part.substring(index + cutLength)
			offset += str.length - cutLength
		}
		parts[i] = part
	}
	for (let i = parts.length - 1; i >= 0; i--) {
		if (parts[i] === "") parts.pop()
		else break
	}
	return parts.join("/")
}
