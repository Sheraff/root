declare var self: ServiceWorkerGlobalScope // eslint-disable-line no-var
export {}

// This is the "Offline copy of pages" service worker
// Add an array of files to cache here.
const OFFLINE_URL = "offline.html"
const CACHE_NAME = "offline"
const OFFLINE_VERSION = 1
const CACHE_VERSION = CACHE_NAME + "-" + OFFLINE_VERSION
const OFFLINE_CACHE_FILES = [
	OFFLINE_URL,
	"/",
	"/index.html",
	"/styles/main.css",
	"/scripts/main.min.js",
]

// Install event
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_VERSION).then((cache) => {
			return cache.addAll(OFFLINE_CACHE_FILES)
		}),
	)
})

// Fetch event
self.addEventListener("fetch", (event) => {
	event.respondWith(
		fetch(event.request).catch(() => {
			return caches.match(event.request).then((response) => {
				return response || (caches.match(OFFLINE_URL) as Promise<Response>)
			})
		}),
	)
})

// Activate event
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(
				keyList.map((key) => {
					if (key !== CACHE_VERSION) {
						return caches.delete(key)
					}
				}),
			)
		}),
	)
})
