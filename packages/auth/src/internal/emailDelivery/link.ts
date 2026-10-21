import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import type { ProofDeliveryMessage } from "../proofs/delivery.ts"
import { ProofConfigurationError, ProofInvalid } from "../proofs/errors.ts"
import { ProofReference } from "../proofs/models.ts"

const secret = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
const payload = Schema.Struct({ reference: ProofReference, token: secret })
const codec = Schema.fromJsonString(payload)

const fragmentSchema = Schema.String.check(
  Schema.isMaxLength(4096),
  Schema.isPattern(/^#eal1\.[A-Za-z0-9_-]+$/)
)

/**
 * Fixed configured HTTPS landing location. Mail vendors must preserve fragments
 * and disable click tracking/rewriting that leaks them into queries or logs.
 * The result remains Redacted because the URL fragment contains a bearer proof.
 *
 * @internal
 */
export const makeEmailLink = Effect.fnUntraced(function*(landing: string) {
  yield* Schema.decodeEffect(Schema.String.check(Schema.isMaxLength(2048)))(landing).pipe(
    Effect.mapError(() => ProofConfigurationError.make({ reason: "delivery" }))
  )

  const url = yield* Effect.try({
    try: () => new URL(landing),
    catch: () => ProofConfigurationError.make({ reason: "delivery" })
  })

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== landing
  ) {
    return yield* ProofConfigurationError.make({ reason: "delivery" })
  }
  const target = url.href

  return Effect.fnUntraced(function*(message: ProofDeliveryMessage) {
    const encoded = yield* Schema.encodeEffect(codec)({
      reference: message.reference,
      token: Redacted.value(message.secret)
    }).pipe(Effect.mapError(() => ProofInvalid.make({})))

    return Redacted.make(`${target}#eal1.${Base64Url.encode(encoded)}`)
  })
})

/** Client-only extraction, without authentication side effects. Caller removes the
 * fragment immediately with history.replaceState, then waits for an intentional
 * action before same-origin CSRF-protected POST. Only reference/token are accepted;
 * flow, binder and return target come from the originating client's private state.
 */
export const parseLinkFragment = Effect.fnUntraced(function*(
  fragment: Redacted.Redacted<string>
) {
  const raw = yield* Schema.decodeEffect(fragmentSchema)(Redacted.value(fragment)).pipe(
    Effect.mapError(() => ProofInvalid.make({}))
  )

  const json = Result.getOrUndefined(Base64Url.decodeString(raw.slice(6)))

  if (json === undefined) return yield* ProofInvalid.make({})

  const decoded = yield* Schema.decodeEffect(codec)(json).pipe(
    Effect.mapError(() => ProofInvalid.make({}))
  )

  return { reference: decoded.reference, secret: Redacted.make(decoded.token) }
})

/** Landing GET is static consumer UI: it must not call issue/attempt/complete or
 * redirect. Consumers choose their CSP script hashes/nonces if adding client code.
 */
export const linkLandingHeaders = Object.freeze({
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
})
