import * as Cause from "effect/Cause"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import {
  OAuthRegistrationIntent,
  type OAuthRegistrationPolicy,
  OAuthRegistrationReference
} from "./registrationModels.ts"
import { OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import type { OAuthSignInFlow, OAuthVerifiedExternalIdentity } from "./signInModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

const tuple = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/oauth-registration-bearer/v1"),
    OAuthRegistrationIntent.fields.context.fields.moduleId,
    OAuthRegistrationReference,
    OAuthRegistrationIntent.fields.context.fields.flowId,
    Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
  ])
)

/** @internal */
export const credentialDigest = Effect.fnUntraced(function*(
  moduleId: typeof OAuthRegistrationIntent.Type.context.moduleId,
  reference: OAuthRegistrationReference,
  flowId: typeof OAuthRegistrationIntent.Type.context.flowId,
  credential: Redacted.Redacted<string>
) {
  const { digest } = yield* Digest.Digest
  const raw = Redacted.value(credential)

  if (!Schema.is(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)))(raw)) {
    return yield* OAuthRejected.make({})
  }
  const bytes = Result.getOrUndefined(Base64Url.decode(raw))

  if (
    raw.length !== 43 ||
    bytes === undefined ||
    bytes.length !== 32 ||
    Base64Url.encode(bytes) !== raw
  ) {
    bytes?.fill(0)

    return yield* OAuthRejected.make({})
  }
  bytes.fill(0)

  const encoded = yield* Schema.encodeEffect(tuple)([
    "effect-auth/oauth-registration-bearer/v1",
    moduleId,
    reference,
    flowId,
    raw
  ]).pipe(Effect.mapError(() => OAuthRejected.make({})))

  const value = yield* digest(Digest.sha256, new TextEncoder().encode(encoded)).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

  return TokenDigest.make(Base64Url.encode(value))
})

/** @internal */
export const prepare = Effect.fnUntraced(function*(
  flow: OAuthSignInFlow,
  identity: OAuthVerifiedExternalIdentity,
  verifiedAtMillis: number,
  policy: OAuthRegistrationPolicy
) {
  const { randomBytes } = yield* SecureRandom.SecureRandom
  const now = DateTime.toEpochMillis(yield* DateTime.now)

  const expiresAtMillis = Math.min(
    now + policy.lifetimeMillis,
    flow.context.requestBindingExpiresAtMillis,
    verifiedAtMillis + policy.maximumVerificationAgeMillis
  )

  if (expiresAtMillis <= now) return undefined

  const referenceBytes = yield* randomBytes(32).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

  const reference = OAuthRegistrationReference.make(Base64Url.encode(referenceBytes))

  referenceBytes.fill(0)

  const credentialBytes = yield* randomBytes(32).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

  const credential = Redacted.make(Base64Url.encode(credentialBytes))

  credentialBytes.fill(0)

  const intent = yield* snapshotOAuthRegistrationIntent.effect({
    namespace: "effect-auth/oauth-registration-intent/v1",
    reference,
    context: flow.context,
    identity: identity.identity,
    ...(identity.profile === undefined ? {} : { profile: identity.profile }),
    ...(identity.upstreamAuthenticatedAt === undefined
      ? {}
      : { upstreamAuthenticatedAt: identity.upstreamAuthenticatedAt }),
    verifiedAtMillis,
    credentialDigest: yield* credentialDigest(
      flow.context.moduleId,
      reference,
      flow.context.flowId,
      credential
    ),
    issuedAtMillis: now,
    expiresAtMillis,
    retentionUntilMillis: expiresAtMillis + policy.retentionMillis
  })

  return {
    intent,
    command: Object.freeze({
      _tag: "Issue" as const,
      slot: "registration" as const,
      credential,
      expiresAtMillis
    })
  }
})

const snapshotOAuthRegistrationIntent = makeOAuthSnapshot(OAuthRegistrationIntent)
