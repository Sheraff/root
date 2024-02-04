import type { useAuth } from "client/auth/useAuth"
import { createContext } from "react"

export const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null)
