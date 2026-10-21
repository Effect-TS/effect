import { Auth, Http, Password, Sessions } from "@effect/auth"

import { AuthApi } from "./server-contract.ts"

export const AppAuth = Auth.make(AuthApi, {
  sessions: Sessions.stateful(),
  strategies: { password: Password.make() },
  defaultStrategy: "password"
})

export const AuthRoutes = Http.layer(AppAuth, { origin: "https://app.example.com" })
