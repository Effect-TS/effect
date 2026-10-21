import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { OAuthUnavailable } from "./signInErrors.ts"

/** Freeze a detached, validated graph before retaining it or passing it to a
 * callback. This does not validate or copy input; use snapshotOAuth to do both. */
export const freezeOAuth = (value: unknown): void => {
  if (!Predicate.isObjectOrArray(value) || Object.isFrozen(value)) return
  if (DateTime.isDateTime(value)) Object.freeze(DateTime.toPartsUtc(value))
  for (const child of Object.values(value)) freezeOAuth(child)
  Object.freeze(value)
}

/**
 * Compile once for a stable schema; each call still validates, detaches through
 * JSON and recursively freezes its own result. Retains no snapshot values.
 *
 * @internal
 */
export const makeOAuthSnapshot = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S
) => {
  let detach: ((value: S["Type"]) => S["Type"]) | undefined

  const capture = (value: S["Type"]) =>
    Result.try({
      try: () => {
        if (detach === undefined) {
          const codec = Schema.fromJsonString(Schema.toCodecJson(Schema.toType(schema)))
          const encode = Schema.encodeSync(codec)
          const decode = Schema.decodeSync(codec)

          detach = (input) => decode(encode(input))
        }
        // JSON fields can otherwise retain nested input references through validation.
        const result = detach(value)

        freezeOAuth(result)

        return result
      },
      catch: () => OAuthUnavailable.make({})
    })

  const sync = (value: S["Type"]): S["Type"] => {
    const result = capture(value)

    if (Result.isFailure(result)) {
      // oxlint-disable-next-line effect/no-untyped-throw -- Native persistence prepare callbacks require synchronous rejection before physical commit; workflows use effect.
      throw result.failure
    }

    return result.success
  }

  return {
    result: capture,
    sync,
    effect: (value: S["Type"]) => Effect.suspend(() => Effect.fromResult(capture(value)))
  }
}

export const snapshotOAuthSync = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: S["Type"]
): S["Type"] => makeOAuthSnapshot(schema).sync(value)

export const snapshotOAuth = <S extends Schema.Codec<unknown, unknown, never, never>>(
  schema: S,
  value: S["Type"]
) => Effect.suspend(() => makeOAuthSnapshot(schema).effect(value))
