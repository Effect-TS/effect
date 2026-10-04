import * as Effect from "../../Effect.ts"
import * as Redacted from "../../Redacted.ts"

export const resolve = (
  password: Redacted.Redacted | Effect.Effect<Redacted.Redacted> | undefined
): Effect.Effect<string | undefined> =>
  password === undefined
    ? Effect.succeed(undefined)
    : Effect.isEffect(password)
    ? Effect.map(password, Redacted.value)
    : Effect.succeed(Redacted.value(password))
