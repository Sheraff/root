type AddToCache = {
	type: "CACHE_FILE"
	payload: {
		url: string
	}
}

export type Message = AddToCache
