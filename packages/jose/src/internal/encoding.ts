import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { InvalidToken } from "../Errors.ts"

export const JsonObject = Schema.Record(Schema.String, Schema.Json)
export const utf8 = (value: string) => new TextEncoder().encode(value)

const Segment = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]*$/),
  Schema.isMaxLength(65536),
  Schema.makeFilter((value) => {
    const remainder = value.length % 4

    // Unpadded base64url permits only zero unused bits in its last character.
    // Check those bits before decoding instead of re-encoding the complete bytes.
    return (
      remainder === 0 ||
      (remainder === 2 && "AQgw".includes(value.slice(-1))) ||
      (remainder === 3 && "AEIMQUYcgkosw048".includes(value.slice(-1)))
    )
  })
)

const Token = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(65536))

export const parse = <S extends Schema.Constraint>(
  schema: S,
  input: unknown,
  reason: InvalidToken["reason"]
) =>
  Effect.suspend(() => Schema.decodeUnknownEffect(schema)(input, { reportInput: false })).pipe(
    Effect.mapError(() => InvalidToken.make({ reason })),
    // Arbitrary nested input can still invoke foreign getters during decoding.
    Effect.catchDefect(() => InvalidToken.make({ reason }))
  )

export const reveal = <A>(value: Redacted.Redacted<A>) =>
  Effect.try({
    try: () => Redacted.value(value),
    catch: () => InvalidToken.make({ reason: "parameters" })
  })

export const decode = Effect.fnUntraced(function*(
  value: string,
  reason: InvalidToken["reason"] = "serialization"
) {
  yield* parse(Segment, value, reason)

  const bytes = yield* Result.match(Base64Url.decode(value), {
    onFailure: () => Effect.fail(InvalidToken.make({ reason })),
    onSuccess: Effect.succeed
  })

  return bytes
})

export const json = Effect.fnUntraced(function*(
  bytes: Uint8Array,
  reason: InvalidToken["reason"]
) {
  const value = yield* Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    catch: () => InvalidToken.make({ reason })
  })

  return yield* parse(Schema.fromJsonString(JsonObject), value, reason)
})

export const stringify = (value: Readonly<Record<string, Schema.Json>>) =>
  Schema.encodeEffect(Schema.fromJsonString(JsonObject))(value, { reportInput: false })

export const split = Effect.fnUntraced(function*(input: Redacted.Redacted<string>, count: number) {
  const value = yield* parse(Token, yield* reveal(input), "serialization")
  const parts = value.split(".")

  if (parts.length !== count) return yield* InvalidToken.make({ reason: "serialization" })

  return parts
})
