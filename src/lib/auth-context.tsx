import { createContext, useContext } from 'react'

type AuthContextValue = {
  exitGuestMode: () => void
}

export const AuthContext = createContext<AuthContextValue>({ exitGuestMode: () => {} })
export const useAuth = () => useContext(AuthContext)
