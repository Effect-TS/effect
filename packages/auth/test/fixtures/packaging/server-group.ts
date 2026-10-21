import { Auth, Http, Sessions } from "@effect/auth"
import { Password } from "@effect/auth/strategies"

import { AuthApi } from "./server-contract.ts"

export const AppAuth = Auth.make(AuthApi, {
  sessions: Sessions.stateful(),
  strategies: { password: Password.make() },
  defaultStrategy: "password"
})

export const AuthRoutes = Http.layer(AppAuth, { origin: "https://app.example.com" })
