import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { AuthenticationClock } from "../operations/clock.ts"
import type { AuthCredentialCommand } from "../operations/credentials.ts"
import { makeSessionSigningCodec, SessionSigningKeys } from "./crypto.ts"
import { SessionInvalid, SessionUnavailable } from "./errors.ts"
import type { SessionMetadata } from "./models.ts"
import { type SessionPolicy, validateSessionTimeline } from "./policy.ts"

export type SessionCacheCommand = AuthCredentialCommand & { readonly slot: "session-cache" }

export const sessionCacheTransport = Symbol("effect-auth/session-cache-transport")

export interface SessionCacheTransport {
  readonly rotate: Effect.Effect<Redacted.Redacted<string>, SessionUnavailable>
  readonly lifetimeMillis: number
}

export type SessionCacheOwner = {
  readonly [sessionCacheTransport]?: SessionCacheTransport
}

/** @internal */
export const SessionCacheGeneration = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))

/**
 * Private implementation; only configured Auth Layers install it.
 *
 * @internal
 */
export interface SessionCookieCache<Session> {
  readonly transport: SessionCacheTransport
  readonly read: (
    credential: Redacted.Redacted<string>,
    cached: Redacted.Redacted<string>,
    generation: Redacted.Redacted<string>
  ) => Effect.Effect<Session, SessionInvalid | SessionUnavailable>
  readonly write: (
    credential: Redacted.Redacted<string>,
    session: Session,
    checkedAt: DateTime.Utc,
    generation: Redacted.Redacted<string>
  ) => Effect.Effect<SessionCacheCommand, SessionUnavailable>
}

interface CacheService<Id extends string, Session> {
  readonly moduleId: Id
  readonly session: Types.Invariant<Session>
}

/** @internal */
export const sessionCookieCache = <Id extends string, Session>(moduleId: Id) =>
  Context.Service<CacheService<Id, Session>, SessionCookieCache<Session>>(
    `@effect/auth/sessions/${moduleId}/CookieCache`
  )

/**
 * A signed cookie avoids a storage lookup only for the explicitly configured window.
 *
 * @internal
 */
export const makeSessionCookieCache = Effect.fnUntraced(function*<
  S extends Schema.Codec<SessionMetadata, unknown, unknown, unknown>
>(moduleId: string, sessionSchema: S, policy: SessionPolicy) {
  const maximumAge = policy.positiveCacheMillis ?? 0
  const clockPolicy = yield* AuthenticationClock

  const SessionCodec: Schema.Codec<
    S["Type"],
    S["Encoded"],
    S["DecodingServices"],
    S["EncodingServices"]
  > = sessionSchema

  const Envelope = Schema.Struct({
    purpose: Schema.Literal("effect-auth/session-cache"),
    moduleId: Schema.Literal(moduleId),
    issuer: Schema.Literal(policy.issuer),
    audience: Schema.Literal(policy.audience),
    generation: Schema.Literal(policy.generation),
    requestGeneration: SessionCacheGeneration,
    credentialDigest: Schema.String,
    cachedAt: Schema.DateTimeUtcFromMillis,
    expiresAt: Schema.DateTimeUtcFromMillis,
    session: SessionCodec
  })

  const signing = yield* makeSessionSigningCodec(
    Envelope,
    yield* SessionSigningKeys,
    Math.min(policy.maximumTokenBytes, 3072),
    "session-cache"
  )

  const random = yield* SecureRandom.SecureRandom
  const digestService = yield* Digest.Digest
  const encoder = new TextEncoder()

  const digest = (credential: Redacted.Redacted<string>) =>
    digestService.digest(Digest.sha256, encoder.encode(Redacted.value(credential))).pipe(
      Effect.map(Base64Url.encode),
      Effect.catchDefect(() => Effect.fail(SessionUnavailable.make({}))),
      Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
    )

  return {
    transport: {
      lifetimeMillis: policy.maximumIssuedAbsoluteLifetimeMillis,
      rotate: random.randomBytes(32).pipe(
        Effect.map((bytes) => Redacted.make(Base64Url.encode(bytes))),
        Effect.catchDefect(() => Effect.fail(SessionUnavailable.make({}))),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => SessionUnavailable.make({}))))
      )
    },
    read: Effect.fnUntraced(function*(
      credential: Redacted.Redacted<string>,
      cached: Redacted.Redacted<string>,
      generation: Redacted.Redacted<string>
    ) {
      const envelope = yield* signing.decode(cached)
      const credentialDigest = yield* digest(credential)
      const now = DateTime.toEpochMillis(yield* DateTime.now)
      const cachedAt = DateTime.toEpochMillis(envelope.cachedAt)
      const expiresAt = DateTime.toEpochMillis(envelope.expiresAt)

      if (
        maximumAge <= 0 ||
        cachedAt - now > clockPolicy.futureToleranceMillis ||
        expiresAt <= now ||
        expiresAt <= cachedAt ||
        expiresAt - cachedAt > maximumAge ||
        envelope.credentialDigest !== credentialDigest ||
        envelope.requestGeneration !== Redacted.value(generation)
      ) {
        return yield* SessionInvalid.make({})
      }
      yield* validateSessionTimeline(envelope.session, policy).pipe(
        Effect.provideService(AuthenticationClock, clockPolicy)
      )

      return envelope.session
    }),
    write: Effect.fnUntraced(function*(
      credential: Redacted.Redacted<string>,
      session: S["Type"],
      checkedAt: DateTime.Utc,
      generation: Redacted.Redacted<string>
    ) {
      const now = yield* DateTime.now

      const expiresAtMillis = Math.min(
        DateTime.toEpochMillis(checkedAt) + maximumAge,
        DateTime.toEpochMillis(session.expiresAt),
        DateTime.toEpochMillis(session.absoluteExpiresAt)
      )

      if (expiresAtMillis <= DateTime.toEpochMillis(now)) return yield* SessionUnavailable.make({})

      const cached = yield* signing.encode({
        purpose: "effect-auth/session-cache",
        moduleId,
        issuer: policy.issuer,
        audience: policy.audience,
        generation: policy.generation,
        requestGeneration: Redacted.value(generation),
        credentialDigest: yield* digest(credential),
        cachedAt: checkedAt,
        expiresAt: DateTime.makeUnsafe(expiresAtMillis),
        session
      })

      return {
        _tag: "Issue" as const,
        slot: "session-cache" as const,
        credential: cached,
        expiresAtMillis
      }
    })
  } satisfies SessionCookieCache<S["Type"]>
})
