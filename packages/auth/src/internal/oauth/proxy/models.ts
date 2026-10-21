import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { RequestBindingFlowId } from "../../operations/requestBindingModels.ts"
import { origin } from "../../shared/origin.ts"
import { OAuthProviderKey } from "../schema.ts"
import {
  OAuthAuthorizationPrompt,
  OAuthCallbackId,
  OAuthInstant,
  OAuthLoginHint,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthVerifiedExternalIdentity
} from "../signInModels.ts"

export class Rejected extends Schema.TaggedError<Rejected>()("OAuthProxyRejected", {}) {}
export class Unavailable extends Schema.TaggedError<Unavailable>()("OAuthProxyUnavailable", {}) {}

export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  "OAuthProxyConfigurationError",
  {}
) {}

/** @internal */
export const Random = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
/** @internal */
export const Label = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/))

/** @internal */
export const Path = Schema.String.check(
  Schema.isPattern(/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/)
)

/**
 * Exact canonical HTTPS callback, or explicitly registered HTTP loopback callback.
 *
 * @internal
 */
export const CompletionUrl = Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.makeFilter((value) => {
    try {
      const url = new URL(value)

      return (
        Schema.is(origin)(url.origin) &&
        Schema.is(Path)(url.pathname) &&
        value === `${url.origin}${url.pathname}` &&
        !url.hostname.includes("*")
      )
    } catch {
      return false
    }
  })
)

/** A credential authorizes only this environment's registered completions.
 * It is not an identity signing key. Never expose it to browser code. */
export const Environment = Schema.Struct({
  id: Label,
  secret: Schema.Redacted(Random),
  callbacks: Schema.NonEmptyArray(
    Schema.Struct({
      provider: OAuthProviderKey,
      callbackId: OAuthCallbackId,
      redirectUri: CompletionUrl
    })
  ).check(Schema.isMaxLength(16))
})

export type Environment = typeof Environment.Type

/** @internal */
export const Begin = Schema.Struct({
  environment: Label,
  provider: OAuthProviderKey,
  callbackId: OAuthCallbackId,
  redirectUri: CompletionUrl,
  flowId: RequestBindingFlowId,
  verifierDigest: Random,
  prompt: Schema.optionalKey(OAuthAuthorizationPrompt),
  loginHint: Schema.optionalKey(OAuthLoginHint)
})

/** @internal */
export const Prepared = Schema.Struct({
  configuration: OAuthProtocolConfiguration,
  authorizationUrl: Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(16384))),
  state: Schema.RedactedFromValue(Random),
  oidcNonce: Schema.optionalKey(Schema.RedactedFromValue(Random))
})

/** @internal */
export const Redeem = Schema.Struct({
  environment: Label,
  configuration: OAuthProtocolConfiguration,
  state: Schema.RedactedFromValue(Random),
  code: Schema.RedactedFromValue(Random),
  verifier: Schema.RedactedFromValue(Random)
})

export const FlowContext = Schema.Struct({
  id: Random,
  proxy: CompletionUrl,
  environment: Label,
  flowId: RequestBindingFlowId,
  verifierDigest: Random,
  configuration: OAuthProtocolConfiguration,
  upstream: OAuthProtocolConfiguration,
  /** Provider callback transport captured at prepare; the app handoff uses GET. */
  responseMode: Schema.Literals(["query", "form_post"]),
  expiresAtMillis: OAuthInstant
})

export const Envelope = Schema.Struct({
  format: Schema.Literal("oauth-proxy-xchacha20poly1305-v1"),
  keyId: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/)),
  nonce: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{32}$/)),
  ciphertext: Schema.RedactedFromValue(
    Schema.String.check(Schema.isMaxLength(174784), Schema.isPattern(/^[A-Za-z0-9_-]+$/))
  )
})

export const Payload = Schema.Union([
  Schema.TaggedStruct("Pending", { preparation: OAuthProtocolPreparation }),
  Schema.TaggedStruct("Verified", { identity: OAuthVerifiedExternalIdentity })
])

const base = { version: Random, context: FlowContext }

export const Record = Schema.Union([
  Schema.TaggedStruct("Pending", { ...base, sealed: Envelope }),
  Schema.TaggedStruct("Exchanging", base),
  Schema.TaggedStruct("Ready", {
    ...base,
    sealed: Envelope,
    codeDigest: Random,
    handoffExpiresAtMillis: OAuthInstant
  }),
  Schema.TaggedStruct("Consumed", base)
])

export type Record = typeof Record.Type

/** Standalone, linearizable commits shared by every callback-server replica.
 * Insert never overwrites. CAS checks version and authority-time expiry, keeps
 * context immutable, and changes version. Never retry an unknown commit, reset
 * Exchanging/Consumed, or reissue a receipt. Retain until context.expiresAtMillis;
 * Ready -> Consumed must also check the stored handoffExpiresAtMillis against
 * authority time in the same CAS. Expired rows can be deleted.
 * Keys are SHA-256(state), never raw bearers.
 */
export class Persistence extends Context.Service<
  Persistence,
  {
    readonly get: (namespace: string, id: string) => Effect.Effect<Record | undefined, Unavailable>
    readonly insert: (namespace: string, record: Record) => Effect.Effect<boolean, Unavailable>
    readonly compareAndSet: (
      namespace: string,
      version: string,
      record: Record
    ) => Effect.Effect<boolean, Unavailable>
  }
>()("@effect/auth/OAuthProxy/Persistence") {}

export class Protector extends Context.Service<
  Protector,
  {
    readonly seal: (
      context: typeof FlowContext.Type,
      payload: typeof Payload.Type
    ) => Effect.Effect<typeof Envelope.Type, Unavailable>
    readonly open: (
      context: typeof FlowContext.Type,
      envelope: typeof Envelope.Type
    ) => Effect.Effect<typeof Payload.Type, Unavailable>
  }
>()("@effect/auth/OAuthProxy/Protector") {}
