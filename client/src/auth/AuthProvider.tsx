import { AuthContext } from "client/auth/AuthContext"
import { useAuth } from "client/auth/useAuth"
import { useAuthContext } from "client/auth/useAuthContext"
import { DbProvider } from "client/db/ParentTest"
import { type ReactNode } from "react"

const UserDbProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuthContext()
	if (auth.type === "signed-in") {
		return <DbProvider name={auth.userId}>{children}</DbProvider>
	}
	return <>{children}</>
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const auth = useAuth()
	return (
		<AuthContext.Provider value={auth}>
			<UserDbProvider>{children}</UserDbProvider>
		</AuthContext.Provider>
	)
}
