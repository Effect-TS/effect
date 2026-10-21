import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"

import type { HookDenied } from "../hooks/models.ts"
import { AuthenticationClock } from "../operations/clock.ts"
import { guest } from "../operations/context.ts"
import { AuthCredentialCommandCollector, AuthRevealCommandCollectorService } from "../operations/credentials.ts"
import { AuthenticationRequired, type OperationBoundaryError } from "../operations/errors.ts"
import {
  SessionCacheGeneration,
  type SessionCacheOwner,
  sessionCacheTransport,
  sessionCookieCache
} from "../sessions/cookieCache.ts"
import {
  type SessionError,
  SessionInvalid,
  type SessionSignOutUnavailable,
  type SessionUnavailable
} from "../sessions/errors.ts"
import { CurrentSessionInvocation, SessionVerificationCapture } from "../sessions/invocation.ts"
import type { SessionReadOptions, SessionSignOut } from "../sessions/models.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { reportAuthDiagnostic, reportAuthFailure, withoutObservability } from "../shared/diagnostics.ts"
import { AuthRequest } from "./authRequest.ts"

export type SessionApiError = SessionError | HookDenied | OperationBoundaryError

const cacheFallback = <A>(fallback: A) => <B, R>(effect: Effect.Effect<B, SessionInvalid | SessionUnavailable, R>) =>
  effect.pipe(
    Effect.catchCause((cause) => {
      if (Cause.hasDies(cause) || Cause.hasInterrupts(cause)) return Effect.failCause(cause)

      return reportAuthFailure(
        "session-cache",
        Cause.fromReasons(
          cause.reasons.filter(
            (reason) => Cause.isFailReason(reason) && reason.error._tag === "SessionUnavailable"
          )
        )
      ).pipe(Effect.as(fallback))
    })
  )

/** Session actions share implementations across HTTP, native and local callers. */
export type SessionApi<Session, R = never> = SessionCacheOwner & {
  /** Explicit credential verification; does not read a request or renew credentials. */
  readonly verifySession: (
    credential: Redacted.Redacted<string>
  ) => Effect.Effect<Session, SessionApiError>
  /** Missing or invalid credentials are anonymous; availability failures remain failures.
   * Set fresh to bypass the cookie cache. */
  readonly getSession: (
    options?: SessionReadOptions
  ) => Effect.Effect<Session | null, SessionApiError, AuthRequest | R>
  readonly requireSession: () => Effect.Effect<Session, SessionApiError, AuthRequest | R>
  /** Does not preverify. Local clearing and server invalidation have distinct outcomes. */
  readonly signOut: () => Effect.Effect<
    SessionSignOut | SessionSignOutUnavailable,
    SessionApiError,
    AuthRequest | R
  >
  /** Explicit renewal; ordinary session reads never rotate credentials. */
  readonly renewSession: () => Effect.Effect<Session, SessionApiError, AuthRequest | R>
}

/** @internal */
export const makeSessionApi = Effect.fnUntraced(
  function*<const Id extends string, Claims extends Schema.Codec<unknown, unknown, unknown, unknown>>(
    sessions: ReturnType<typeof makeSessionModule<Id, Claims>>
  ) {
    const strategy = yield* sessions.SessionStrategy
    const clockPolicy = yield* AuthenticationClock

    const withRenewalTiming = Effect.fnUntraced(function*(session: typeof sessions.Session.Type) {
      const now = DateTime.toEpochMillis(yield* DateTime.now)
      const due = DateTime.toEpochMillis(session.issuedAt) + strategy.policy.renewalIntervalMillis
      const expires = DateTime.toEpochMillis(session.expiresAt)
      const { renewAfterMillis: _, ...value } = session

      return due < expires && expires < DateTime.toEpochMillis(session.absoluteExpiresAt)
        ? { ...value, renewAfterMillis: Math.max(0, due - now) }
        : value
    })

    const cache = yield* Effect.serviceOption(
      sessionCookieCache<Id, typeof sessions.Session.Type>(sessions.moduleId)
    )

    // Handler installation captures its input context. Supply only its shared
    // dependency, so constructing auth inside a request cannot retain that request.
    const handlers = yield* Layer.buildWithScope(
      sessions.sessionHandlersLayer,
      yield* Effect.scope
    ).pipe(
      Effect.updateContext((_: Context.Context<never>) =>
        Context.make(sessions.SessionStrategy, strategy).pipe(
          Context.add(AuthenticationClock, clockPolicy)
        )
      )
    )

    // Keep application codec dependencies, but never capture a request or its collectors.
    const services = (yield* Effect.context<
      Claims["DecodingServices"] | Claims["EncodingServices"]
    >()).pipe(
      withoutObservability,
      Context.merge(handlers),
      Context.add(AuthenticationClock, clockPolicy),
      Context.omit(
        AuthRequest,
        CurrentSessionInvocation,
        SessionVerificationCapture,
        Scope.Scope,
        AuthCredentialCommandCollector,
        AuthRevealCommandCollectorService
      )
    )

    const verifySession = Effect.fn("Auth.verifySession")(function*(
      credential: Redacted.Redacted<string>
    ) {
      return yield* sessions.operations.Verify.invoke(guest, {
        credential: Redacted.value(credential)
      }).pipe(
        Effect.provide(services),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) => error._tag === "InvalidOperationInput" ? SessionInvalid.make({}) : error)
          )
        ),
        Effect.tapError((error) =>
          reportAuthDiagnostic(
            "session-verification",
            error._tag === "SessionInvalid" ? "rejected" : "unavailable"
          )
        ),
        Effect.flatMap(withRenewalTiming)
      )
    })

    const getSession = Effect.fn("Auth.getSession")(function*(options?: SessionReadOptions) {
      const request = yield* AuthRequest
      const credential = request.credentials.session
      const cached = request.credentials["session-cache"]
      const generation = request.sessionCacheGeneration
      const cacheEnabled = strategy.capabilities.positiveCacheMillis > 0 && Option.isSome(cache)

      const cacheable = cacheEnabled &&
        request.sessionCacheCommandSink !== undefined &&
        request.actionMode === "query" &&
        generation !== undefined &&
        Schema.is(SessionCacheGeneration)(Redacted.value(generation))

      const original = credential !== undefined && options?.fresh !== true
        ? yield* sessions.capturedSession(credential).pipe(
          Effect.provide(services),
          Effect.provideService(sessions.SessionStrategy, strategy),
          Effect.catchCause((cause) =>
            cause.reasons.every(
                (reason) => Cause.isFailReason(reason) && reason.error._tag === "SessionInvalid"
              )
              ? Effect.succeedNone
              : Effect.failCause(cause)
          )
        )
        : Option.none()

      if (
        Option.isNone(original) &&
        cacheable &&
        credential !== undefined &&
        cached !== undefined &&
        options?.fresh !== true
      ) {
        const snapshot = yield* cache.value
          .read(credential, cached, generation)
          .pipe(cacheFallback(null))

        if (snapshot !== null) return yield* withRenewalTiming(snapshot)
      }

      // Anchor cache freshness before storage: a delayed response must not start
      // a new revocation window after the authoritative snapshot was observed.
      const checkedAt = Option.isSome(original) ? original.value.checkedAt : yield* DateTime.now

      const session = Option.isSome(original)
        ? original.value.session
        : credential === undefined
        ? null
        : yield* verifySession(credential).pipe(
          Effect.catchCause((cause) =>
            cause.reasons.every(
                (reason) => Cause.isFailReason(reason) && reason.error._tag === "SessionInvalid"
              )
              ? Effect.succeed(null)
              : Effect.failCause(cause)
          )
        )

      if (cacheEnabled && request.sessionCacheCommandSink !== undefined) {
        if (cacheable && session !== null && credential !== undefined) {
          const command = yield* cache.value
            .write(credential, session, checkedAt, generation)
            .pipe(cacheFallback({ _tag: "Clear" as const, slot: "session-cache" as const }))

          yield* request.sessionCacheCommandSink(command)
        } else {
          if (cached !== undefined) {
            yield* request.sessionCacheCommandSink({ _tag: "Clear", slot: "session-cache" })
          }
          if (
            request.actionMode === "query" &&
            session !== null &&
            request.initializeSessionCache !== undefined
          ) {
            // Bootstrap only the binding. A delayed read may replace a generation,
            // but must never deliver a matching pre-mutation snapshot with it.
            yield* request.initializeSessionCache.pipe(cacheFallback(undefined))
          }
        }
      }

      return session === null ? null : yield* withRenewalTiming(session)
    })

    const requireSession = Effect.fn("Auth.requireSession")(function*() {
      const session = yield* getSession()

      if (session === null) return yield* AuthenticationRequired.make({})

      return session
    })

    const signOut = Effect.fn("Auth.signOut")(function*() {
      const request = yield* AuthRequest

      if (request.beforeMutation !== undefined) yield* request.beforeMutation
      const credential = request.credentials.session

      if (credential === undefined || Redacted.value(credential) === "") {
        yield* request.credentialCommandSink([{ _tag: "Clear", slot: "session" }])

        return { clearCredential: true as const, invalidation: "already-invalid" as const }
      }

      return yield* sessions.operations.SignOut.invoke(guest, {
        credential: Redacted.value(credential)
      }).pipe(
        Effect.provide(services),
        Effect.provideService(AuthCredentialCommandCollector, request.credentialCommandSink)
      )
    })

    const renewSession = Effect.fn("Auth.renewSession")(function*() {
      const request = yield* AuthRequest

      if (request.beforeMutation !== undefined) yield* request.beforeMutation
      const credential = request.credentials.session

      if (credential === undefined) return yield* AuthenticationRequired.make({})

      return yield* sessions.operations.Renew.invoke(guest, {
        credential: Redacted.value(credential)
      }).pipe(
        Effect.provide(services),
        Effect.provideService(AuthCredentialCommandCollector, request.credentialCommandSink),
        Effect.flatMap(withRenewalTiming)
      )
    })

    const api: SessionApi<typeof sessions.Session.Type> = {
      ...(Option.isSome(cache) ? { [sessionCacheTransport]: cache.value.transport } : {}),
      verifySession,
      getSession,
      requireSession,
      signOut,
      renewSession
    }

    return api
  }
)
