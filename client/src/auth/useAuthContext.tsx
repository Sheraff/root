import { AuthContext } from "client/auth/AuthContext"
import { useContext } from "react"

export function useAuthContext() {
	const auth = useContext(AuthContext)
	if (!auth) throw new Error("useAuthContext must be used within an AuthProvider")
	return auth
}
