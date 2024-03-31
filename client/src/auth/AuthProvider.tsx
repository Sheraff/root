import { migrations, schema } from "assets/drizzle-test"
import { AuthContext } from "client/auth/AuthContext"
import { useAuth } from "client/auth/useAuth"
import { useAuthContext } from "client/auth/useAuthContext"
import { useDbProvider } from "client/db/DbProvider"
import { type ReactNode } from "react"

export const UserDbProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuthContext()
	useDbProvider(auth.type === "signed-in" ? auth.userId : undefined, schema, migrations)
	return children
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuth()
	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
