import { useEffect, useState } from "react"
import { PUBLIC_CONFIG } from "shared/env/publicConfig"
import { providers, type Provider } from "client/auth/providers"

type States =
	| {
			type: "unauthenticated"
			submitInviteCode: (inviteCode: string) => Promise<Response>
			signIn: (provider: string) => void
			providers: Provider[]
	  }
	| {
			type: "creating-account"
			createAccount: (provider: string) => void
			cancelCreateAccount: () => void
			providers: Provider[]
	  }
	| {
			type: "signed-in"
			userId: string
			signOut: () => Promise<Response>
			linkAccount: (provider: string) => Promise<void>
			providers: Provider[]
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

declare global {
	const cookieStore: EventTarget
}

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
	globalThis.location.href = `/api/oauth/connect/${provider}`
}

/**
 * Should transition state from "creating-account" to "unauthenticated"
 */
function cancelCreateAccount() {
	document.cookie = `${PUBLIC_CONFIG.accountCreationCookie}=; max-age=0; path=/;`
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
	globalThis.location.href = `/api/oauth/connect/${provider}`
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

const filteredProviders = providers.filter((p) => __AUTH_PROVIDERS__.includes(p.key))

/**
 * Hook to manage authentication state. This hook should probably be called only once,
 * and the state should be passed down to the rest of the app using a context.
 */
export function useAuth(): States {
	const [userId, setUserId] = useState<string | undefined>(() =>
		getCookie(PUBLIC_CONFIG.userIdCookie)
	)
	const [creatingAccount, setCreatingAccount] = useState(() =>
		getCookie(PUBLIC_CONFIG.accountCreationCookie)
	)

	useEffect(() => {
		const controller = new AbortController()

		let doubleEventTimeout: NodeJS.Timeout
		cookieStore.addEventListener(
			"change",
			() => {
				clearCookieCache()
				clearTimeout(doubleEventTimeout)
				doubleEventTimeout = setTimeout(() => {
					setUserId(getCookie(PUBLIC_CONFIG.userIdCookie))
					setCreatingAccount(getCookie(PUBLIC_CONFIG.accountCreationCookie))
				}, 10)
			},
			{ signal: controller.signal }
		)

		return () => controller.abort()
	}, [])

	if (userId) {
		return {
			type: "signed-in",
			userId,
			signOut,
			linkAccount,
			providers: filteredProviders,
		}
	}

	if (creatingAccount) {
		return {
			type: "creating-account",
			createAccount,
			cancelCreateAccount,
			providers: filteredProviders,
		}
	}

	return {
		type: "unauthenticated",
		submitInviteCode,
		signIn,
		providers: filteredProviders,
	}
}
