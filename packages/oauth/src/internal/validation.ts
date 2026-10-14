import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { ConfigurationError, Unavailable } from "../Errors.ts"

export const text = (maximum: number) => Schema.NonEmptyString.check(Schema.isMaxLength(maximum))

export const integer = (minimum: number, maximum: number) => Schema.Int.check(Schema.isBetween({ minimum, maximum }))

export const secret = (maximum: number) => Schema.Redacted(text(maximum), { disallowJsonEncode: true })

/** At most 64 nested containers and 65,536 values, including the root object. */
export const JsonObject = Schema.Record(Schema.String, Schema.Json).check(
  Schema.makeFilter((value) => {
    const pending: Array<{ value: Schema.JsonObject | Schema.JsonArray; depth: number }> = [
      { value, depth: 1 }
    ]

    let values = 1

    for (let entry = pending.pop(); entry !== undefined; entry = pending.pop()) {
      const { value, depth } = entry

      if (depth > 64) return false
      const children = Object.values(value)

      values += children.length
      if (values > 65536) return false
      for (const child of children) {
        if (child !== null && typeof child === "object") {
          pending.push({ value: child, depth: depth + 1 })
        }
      }
    }

    return true
  })
)

const validUrl = (value: string, loopback: boolean) => {
  try {
    const url = new URL(value)

    return (
      (url.protocol === "https:" ||
        (loopback &&
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) &&
      url.username === "" &&
      url.password === "" &&
      !value.includes("#") &&
      // oxlint-disable-next-line no-control-regex -- Reject URL parser normalization of untrusted controls.
      !/[\s\\\u0000-\u001f\u007f]/u.test(value)
    )
  } catch {
    return false
  }
}

export const Endpoint = text(2048).check(Schema.makeFilter((value) => validUrl(value, false)))

export const Issuer = Endpoint.check(
  Schema.makeFilter(
    (value) => !value.includes("?") && !new URL(value).pathname.includes("/.well-known/")
  )
)

export const Callback = text(2048).check(
  Schema.makeFilter(
    (value) => validUrl(value, true) && new URL(value).href === value && !value.includes("?")
  )
)

// oxlint-disable-next-line no-control-regex -- RFC6749 scope-token permits these visible ASCII ranges.
export const ScopeName = Schema.String.check(Schema.isPattern(/^[\x21\x23-\x5b\x5d-\x7e]{1,256}$/))

export const Scopes = Schema.Array(ScopeName).check(
  Schema.isMaxLength(64),
  Schema.makeFilter((values) => new Set(values).size === values.length)
)

export const Resource = text(2048).check(
  Schema.makeFilter((value) => {
    try {
      const url = new URL(value)

      return (
        // oxlint-disable-next-line no-control-regex -- Preserve exact resource identifiers.
        url.username === "" && url.password === "" && !/[\s\\#\u0000-\u001f\u007f]/u.test(value)
      )
    } catch {
      return false
    }
  })
)

export const Resources = Schema.Array(Resource).check(Schema.isMaxLength(64))

export const RequestOptions = Schema.Struct({
  timeoutMs: Schema.Finite.check(Schema.isBetween({ minimum: 1, maximum: 60000 })),
  maxResponseBytes: integer(1, 1048576).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(1048576))
  )
})

export const Verifier = Schema.Redacted(
  Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._~-]{43,128}$/)),
  { disallowJsonEncode: true }
)

export const Challenge = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))

export const reserved = new Set([
  "client_id",
  "client_secret",
  "client_assertion",
  "client_assertion_type",
  "redirect_uri",
  "response_type",
  "response_mode",
  "state",
  "code",
  "code_verifier",
  "code_challenge",
  "code_challenge_method",
  "nonce",
  "scope",
  "iss",
  "grant_type",
  "refresh_token",
  "token",
  "token_type_hint",
  "max_age",
  "request",
  "request_uri",
  "authorization_details",
  "id_token_hint",
  "login_hint",
  "login_hint_token",
  "subject_token",
  "subject_token_type",
  "actor_token",
  "actor_token_type",
  "requested_token_type"
])

export const Parameters = Schema.Record(
  Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9._~-]{0,63}$/)),
  Schema.String.check(Schema.isMaxLength(2048))
).check(
  Schema.makeFilter(
    (value) =>
      Object.keys(value).length <= 16 &&
      Object.keys(value).every((key) => !reserved.has(key.toLowerCase()))
  )
)

const forbiddenHeaders = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "host",
  "content-length",
  "content-type",
  "transfer-encoding",
  "connection",
  "upgrade",
  "trailer",
  "te",
  "traceparent",
  "tracestate",
  "baggage"
])

export const Headers = Schema.Record(
  Schema.String.check(Schema.isPattern(/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,64}$/)),
  Schema.String.check(Schema.isMaxLength(2048))
).check(
  Schema.makeFilter((value) => {
    const names = Object.keys(value).map((name) => name.toLowerCase())

    return (
      names.length <= 16 &&
      new Set(names).size === names.length &&
      names.every((name) => !forbiddenHeaders.has(name)) &&
      Object.values(value).every((value) => !/[\r\n]/u.test(value))
    )
  })
)

export const ProtocolEndpoint = Endpoint.check(
  Schema.makeFilter((value) =>
    Array.from(new URL(value).searchParams.keys()).every((key) => !reserved.has(key.toLowerCase()))
  )
)

// Keep exceptions from hostile input access and erased Redacted values inside
// schema decoding; service execution must remain outside these catches.
export const configuration = <S extends Schema.Constraint>(
  schema: S,
  input: unknown,
  reason: ConfigurationError["reason"] = "parameters"
) =>
  Effect.suspend(() => Schema.decodeUnknownEffect(schema)(input, { reportInput: false })).pipe(
    Effect.mapError(() => ConfigurationError.make({ reason })),
    Effect.catchDefect(() => ConfigurationError.make({ reason }))
  )

export const decode = <S extends Schema.Constraint>(schema: S, input: unknown) =>
  Effect.suspend(() => Schema.decodeUnknownEffect(schema)(input, { reportInput: false })).pipe(
    Effect.mapError(() => Unavailable.make({})),
    Effect.catchDefect(() => Unavailable.make({}))
  )

export const reveal = <A>(value: Redacted.Redacted<A>) =>
  Effect.try({ try: () => Redacted.value(value), catch: () => Unavailable.make({}) })

/** Freeze owned configuration snapshots or freshly parsed wire JSON, not caller-owned graphs. */
export const freeze = <A>(value: A): A => {
  const pending: Array<unknown> = [value]
  const seen = new WeakSet<object>()

  while (pending.length > 0) {
    const item = pending.pop()

    if (!Predicate.isObjectOrArray(item) || Redacted.isRedacted(item) || seen.has(item)) continue
    seen.add(item)
    for (const child of Object.values(item)) pending.push(child)
    Object.freeze(item)
  }

  return value
}
