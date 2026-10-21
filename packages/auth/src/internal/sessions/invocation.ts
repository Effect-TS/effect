import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Redacted from "effect/Redacted"

import type { SubjectId } from "../../Schema.ts"
import type { AuthenticationAssurance, AuthInvocation } from "../operations/context.ts"
import type { SessionId } from "./models.ts"

interface VerifiedSession {
  readonly moduleId: string
  readonly credential: Redacted.Redacted<string>
  readonly subjectId: SubjectId
  readonly sessionId: SessionId
  readonly assurance: AuthenticationAssurance
  readonly checkedAtMillis: number
  readonly expiresAtMillis: number
  readonly absoluteExpiresAtMillis: number
  /** Detached private source encoding, never a public operation result. */
  readonly source: string
}

/** One request's authoritative sources. A public cookie-cache hit never enters it. */
export class SessionVerificationCapture extends Context.Service<
  SessionVerificationCapture,
  {
    readonly sessions: ReadonlyArray<VerifiedSession>
    readonly capture: (session: VerifiedSession) => void
    readonly isActive: () => boolean
  }
>()("@effect/auth/internal/SessionVerificationCapture") {}

export class CurrentSessionInvocation extends Context.Service<
  CurrentSessionInvocation,
  {
    readonly invocation: AuthInvocation
    readonly sessions: ReadonlyArray<VerifiedSession>
    readonly isActive: () => boolean
  }
>()("@effect/auth/internal/CurrentSessionInvocation") {}

/**
 * Share caller resolution only while its original request is active.
 *
 * @internal
 */
export const cacheSessionInvocation = Effect.fnUntraced(function*<E, R>(resolve: Effect.Effect<AuthInvocation, E, R>) {
  const capture = yield* Effect.serviceOption(SessionVerificationCapture)
  const cached = yield* Effect.cached(resolve)

  return Effect.suspend(() => Option.isSome(capture) && capture.value.isActive() ? cached : resolve)
})

/**
 * Capture remains active through both caller resolution and its handler. Nested
 * bound methods share the request's sources; escaped effects cannot retain them.
 *
 * @internal
 */
export const withSessionRequest = Effect.fnUntraced(function*<A, E, R>(effect: Effect.Effect<A, E, R>) {
  const existing = yield* Effect.serviceOption(SessionVerificationCapture)

  if (Option.isSome(existing) && existing.value.isActive()) {
    return yield* effect.pipe(Effect.provideService(SessionVerificationCapture, existing.value))
  }
  const sessions: Array<VerifiedSession> = []
  let active = true

  return yield* effect.pipe(
    Effect.provideService(SessionVerificationCapture, {
      sessions,
      capture: (session) => {
        if (active) sessions.push(session)
      },
      isActive: () => active
    }),
    Effect.ensuring(
      Effect.sync(() => {
        active = false
        sessions.length = 0
      })
    )
  )
})

/**
 * Reuse the exact verification that admitted this action as private source
 * evidence. Explicit verification stays fresh; committing owners recheck authority.
 *
 * @internal
 */
export const withSessionInvocation = <A, E, R, E2, R2>(
  resolve: Effect.Effect<AuthInvocation, E2, R2>,
  use: (invocation: AuthInvocation) => Effect.Effect<A, E, R>
) =>
  withSessionRequest(
    Effect.gen(function*() {
      const capture = yield* SessionVerificationCapture
      const invocation = yield* resolve
      const sessions = [...capture.sessions]
      let active = true

      return yield* Effect.suspend(() => use(invocation)).pipe(
        Effect.provideService(CurrentSessionInvocation, {
          invocation,
          sessions,
          isActive: () => active && capture.isActive()
        }),
        Effect.ensuring(
          Effect.sync(() => {
            active = false
            sessions.length = 0
          })
        )
      )
    })
  )
