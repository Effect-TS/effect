import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { SubjectId } from "../../Schema.ts"

/** Adapter failures deliberately omit the native key and rejected wire input. */
export class IdentityCodecError extends Schema.TaggedError<IdentityCodecError>()(
  "IdentityCodecError",
  { reason: Schema.Literals(["invalid-key", "lossy-key"]) }
) {}

/**
 * A consumer's native key remains native in its database. Only the auth boundary
 * uses SubjectId. Neither direction may silently normalize or truncate a key.
 * ID generation belongs to the consumer, including database-generated keys.
 */
export const subjectIdCodec = <A>(schema: Schema.Codec<A, string>) => {
  const decode = Schema.decodeEffect(schema)
  const encode = Schema.encodeEffect(schema)
  const decodeSubject = Schema.decodeEffect(SubjectId)
  const equivalent = Schema.toEquivalence(schema)
  const invalid = () => IdentityCodecError.make({ reason: "invalid-key" })

  return {
    toNative: Effect.fnUntraced(function*(subjectId: SubjectId) {
      const native = yield* decode(subjectId).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, invalid)))
      )

      const roundTrip = yield* encode(native).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, invalid)))
      )

      if (roundTrip !== subjectId) {
        return yield* IdentityCodecError.make({ reason: "lossy-key" })
      }

      return native
    }),
    toSubject: Effect.fnUntraced(function*(native: A) {
      const wire = yield* encode(native).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, invalid)))
      )

      const roundTrip = yield* decode(wire).pipe(
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, invalid)))
      )

      if (!equivalent(native, roundTrip)) {
        return yield* IdentityCodecError.make({ reason: "lossy-key" })
      }

      return yield* decodeSubject(wire).pipe(Effect.mapError(invalid))
    })
  } as const
}

/** Keeps the consumer's UUID version, spelling, and database column unchanged. */
export const stringSubjectId = subjectIdCodec(Schema.NonEmptyString)

/** Rejects unsafe JS integers and noncanonical aliases such as `01` and `1e2`. */
export const numericSubjectId = subjectIdCodec(Schema.FiniteFromString.check(Schema.isInt()))

/** Use for SQL bigint keys that exceed JavaScript's safe integer range. */
export const bigintSubjectId = subjectIdCodec(Schema.BigIntFromString)
