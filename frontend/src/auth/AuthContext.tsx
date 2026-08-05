import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js'
import { userPool } from './cognito'

export interface UserAttributes {
  email: string
  displayName: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  getAccessToken: () => Promise<string | null>
  getUserAttributes: () => Promise<UserAttributes | null>
  signUp: (email: string, displayName: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  resendConfirmationCode: (email: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
  deleteCognitoUser: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => userPool.getCurrentUser() !== null,
  )

  function signUp(email: string, displayName: string, password: string) {
    return new Promise<void>((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'preferred_username', Value: displayName }),
      ]
      userPool.signUp(email, password, attributes, [], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  function confirmSignUp(email: string, code: string) {
    return new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  function resendConfirmationCode(email: string) {
    return new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
      cognitoUser.resendConfirmationCode((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  function signIn(email: string, password: string) {
    return new Promise<void>((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
      const authDetails = new AuthenticationDetails({ Username: email, Password: password })

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          setIsAuthenticated(true)
          resolve()
        },
        onFailure: (err) => reject(err),
      })
    })
  }

  function signOut() {
    const currentUser = userPool.getCurrentUser()
    currentUser?.signOut()
    setIsAuthenticated(false)
  }

  // Clears local session state after the backend has already deleted the
  // Cognito user (via its admin API) as part of DELETE /account — there's no
  // separate self-service Cognito call here, since the user no longer exists.
  function deleteCognitoUser() {
    signOut()
  }

  function getAccessToken(): Promise<string | null> {
    const currentUser = userPool.getCurrentUser()
    if (!currentUser) return Promise.resolve(null)

    return new Promise((resolve) => {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        resolve(!err && session ? session.getAccessToken().getJwtToken() : null)
      })
    })
  }

  function getUserAttributes(): Promise<UserAttributes | null> {
    const currentUser = userPool.getCurrentUser()
    if (!currentUser) return Promise.resolve(null)

    return new Promise((resolve, reject) => {
      currentUser.getSession((sessionErr: Error | null, session: CognitoUserSession | null) => {
        if (sessionErr || !session) return resolve(null)

        currentUser.getUserAttributes((attrErr, attributes) => {
          if (attrErr || !attributes) return reject(attrErr)

          const byName = Object.fromEntries(attributes.map((a) => [a.getName(), a.getValue()]))
          resolve({
            email: byName.email ?? '',
            displayName: byName.preferred_username ?? '',
          })
        })
      })
    })
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        getAccessToken,
        getUserAttributes,
        signUp,
        confirmSignUp,
        resendConfirmationCode,
        signIn,
        signOut,
        deleteCognitoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
