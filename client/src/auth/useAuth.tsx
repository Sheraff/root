import { PUBLIC_CONFIG } from "@shared/env/publicConfig"
import { useEffect, useState } from "react"

type States =
	| {
			type: "unauthenticated"
			submitInviteCode: (inviteCode: string) => Promise<Response>
			signIn: (provider: string) => void
	  }
	| { type: "creating-account"; createAccount: (provider: string) => void }
	| {
			type: "signed-in"
			userId: string
			profile?: { email: string }
			signOut: () => Promise<Response>
			linkAccount: (provider: string) => void
	  }

let cookieCache: Map<string, string | undefined> | null = null
function getCookie(key: string) {
	if (cookieCache) return cookieCache.get(key)
	cookieCache = new Map()
	const cookies = document.cookie.split(";")
	for (const cookie of cookies) {
		const [key, value] = cookie.split("=") as [string, string | undefined]
		cookieCache.set(key.trim(), value?.trim())
	}
	return cookieCache.get(key)
}
function clearCookieCache() {
	cookieCache = null
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any -- cookieStore is not in lib.dom.d.ts because it's only supported in Chrome
const cookieStore = (window as any).cookieStore as EventTarget

/**
 * Should transition state from "unauthenticated" to "creating-account"
 */
function submitInviteCode(inviteCode: string) {
	return fetch("/api/oauth/invite", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code: inviteCode }),
	})
}

/**
 * Should transition state from "creating-account" to "signed-in"
 */
function createAccount(provider: string) {
	window.location.href = `/api/oauth/connect/${provider}`
}

/**
 * Should transition state from "signed-in" to "unauthenticated"
 */
function signOut() {
	return fetch("/api/oauth/session", { method: "DELETE" })
}

/**
 * Should transition state from "unauthenticated" to "signed-in" (only if account already exists)
 */
function signIn(provider: string) {
	window.location.href = `/api/oauth/connect/${provider}`
}

function linkAccount(provider: string) {
	return fetch("/api/oauth/invite").then((res) => {
		if (res.ok) {
			window.location.href = `/api/oauth/connect/${provider}`
		} else {
			throw new Error("Failed to get invite code", { cause: res.statusText })
		}
	})
}

export function useAuth(): States {
	const [userId, setUserId] = useState<string | undefined>(() =>
		getCookie(PUBLIC_CONFIG.userIdCookie),
	)
	const [creatingAccount, setCreatingAccount] = useState(() =>
		getCookie(PUBLIC_CONFIG.accountCreationCookie),
	)
	const [profile, setProfile] = useState<{ email: string } | undefined>()

	useEffect(() => {
		const controller = new AbortController()
		let online = navigator.onLine
		let checking = false
		let lastValue = getCookie(PUBLIC_CONFIG.userIdCookie)

		const checkSession = async () => {
			console.log("checkSession", { online, checking })
			if (!online || checking) return
			checking = true
			const res = await fetch("/api/oauth/session")
			checking = false
			if (res.status === 401) {
				setUserId(undefined)
				setProfile(undefined)
				return
			}
			const json = (await res.json()) as { email: string }
			setProfile(json)
		}

		addEventListener(
			"online",
			() => {
				online = true
				checkSession()
			},
			{ signal: controller.signal },
		)

		addEventListener(
			"offline",
			() => {
				online = false
				setUserId(getCookie(PUBLIC_CONFIG.userIdCookie))
			},
			{ signal: controller.signal },
		)

		let doubleEventTimeout: NodeJS.Timeout
		cookieStore.addEventListener(
			"change",
			() => {
				clearCookieCache()
				clearTimeout(doubleEventTimeout)
				doubleEventTimeout = setTimeout(() => {
					const value = getCookie(PUBLIC_CONFIG.userIdCookie)
					if (value !== lastValue) {
						lastValue = value
						checkSession()
					}
					setCreatingAccount(getCookie(PUBLIC_CONFIG.accountCreationCookie))
				}, 10)
			},
			{ signal: controller.signal },
		)

		if (online) {
			checkSession()
		}

		return () => controller.abort()
	}, [])

	if (userId) {
		return {
			type: "signed-in",
			userId,
			profile,
			signOut,
			linkAccount,
		}
	}

	if (creatingAccount) {
		return {
			type: "creating-account",
			createAccount,
		}
	}

	return {
		type: "unauthenticated",
		submitInviteCode,
		signIn,
	}
}
