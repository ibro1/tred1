import { type Prisma } from "@prisma/client"
import { createCookieSessionStorage } from "@remix-run/node"
import { Authenticator } from "remix-auth"

import { type modelUser } from "~/models/user.server"
import { formStrategy } from "~/services/auth-strategies/form.strategy"
import { githubStrategy } from "~/services/auth-strategies/github.strategy"
import { googleStrategy } from "~/services/auth-strategies/google.strategy"
import { SolanaStrategy } from "~/services/auth-strategies/solana.strategy"
import { convertDaysToSeconds } from "~/utils/datetime"
import { isProduction, parsedEnv } from "~/utils/env.server"

export const AuthStrategies = {
  FORM: "form",
  GITHUB: "github",
  GOOGLE: "google",
  SOLANA: "solana",
} as const;

export type AuthStrategy = (typeof AuthStrategies)[keyof typeof AuthStrategies];

export const authStorage = createCookieSessionStorage({
  cookie: {
    name: "__auth_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [parsedEnv.SESSION_SECRET],
    secure: isProduction,
    maxAge: convertDaysToSeconds(30), // EDITME: Change session persistence
  },
})

/**
 * UserSession is stored in the cookie
 */
export interface UserSession {
  id: string
  // Add user properties here or extend with a type from the database
}

/**
 * UserData is not stored in the cookie, only retrieved when necessary
 */
export interface UserData
  extends NonNullable<Prisma.PromiseReturnType<typeof modelUser.getForSession>> {}

/**
 * authService
 *
 * Create an instance of the authenticator, pass a generic with what
 * strategies will return and will store in the session
 *
 * When using this, might need to have a cloned request
 * const clonedRequest = request.clone()
 */
export const authService = new Authenticator<UserSession>(authStorage)

// Initialize strategies
authService.use(formStrategy, AuthStrategies.FORM)
authService.use(githubStrategy, AuthStrategies.GITHUB)
authService.use(googleStrategy, AuthStrategies.GOOGLE)
authService.use(new SolanaStrategy(), AuthStrategies.SOLANA)
