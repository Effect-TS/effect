import * as AuthContract from "@effect/auth/AuthContract"
import { Schema } from "effect"

export const AuthApi = AuthContract.make("consumer/Auth", {
  claims: Schema.Struct({ displayName: Schema.String }),
  actions: (sessions) => ({ signIn: AuthContract.passwordSignIn(sessions) })
})
