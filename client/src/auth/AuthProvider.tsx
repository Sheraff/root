import { AuthContext } from "client/auth/AuthContext"
import { useAuth } from "client/auth/useAuth"
import { useAuthContext } from "client/auth/useAuthContext"
import { useDbProvider } from "client/db/DbProvider"
import { type ReactNode } from "react"
import schema from "assets/test-v0.sql"

export const UserDbProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuthContext()
	useDbProvider(auth.type === "signed-in" ? auth.userId : undefined, schema, "test-v0")
	return children
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuth()
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
