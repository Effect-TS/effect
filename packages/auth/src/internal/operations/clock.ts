import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

/** Bound future acceptance and revocation retention, never credential expiry or freshness. */
export const AuthenticationClockPolicy = Schema.Struct({
  futureToleranceMillis: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 60_000 }))
})

export type AuthenticationClockPolicy = typeof AuthenticationClockPolicy.Type

export class AuthenticationClockConfigurationError extends Schema.TaggedError<AuthenticationClockConfigurationError>()(
  "AuthenticationClockConfigurationError",
  {}
) {}

const strict = Object.freeze({ futureToleranceMillis: 0 })

/** One deployment policy for authentication, sessions and their persistence owners.
 * The strict default does not synchronize clocks or measure their offset. */
export class AuthenticationClock extends Context.Reference<AuthenticationClockPolicy>(
  "@effect/auth/operations/AuthenticationClock",
  { defaultValue: () => strict }
) {
  static readonly defaultLayer = Layer.succeed(AuthenticationClock, strict)

  static readonly layer = (policy: AuthenticationClockPolicy) =>
    Layer.effect(
      AuthenticationClock,
      Schema.decodeEffect(AuthenticationClockPolicy)({ ...policy }).pipe(
        Effect.map((value) => Object.freeze(value)),
        Effect.mapError(() => AuthenticationClockConfigurationError.make({}))
      )
    )
}
