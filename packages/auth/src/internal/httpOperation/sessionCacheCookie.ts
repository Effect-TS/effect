import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Cookies from "effect/http/Cookies"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { AuthCredentialCommand } from "../operations/credentials.ts"
import { SessionUnavailable } from "../sessions/errors.ts"
import { reportAuthFailure } from "../shared/diagnostics.ts"
import type { OperationCookie } from "./models.ts"

/** @internal */
export const maximumCookieBytes = 4096

/** @internal */
export const generationCookieConfiguration = (cookie: OperationCookie): OperationCookie => ({
  ...cookie,
  name: `${cookie.name}-generation`
})

/** @internal */
export const makeCacheCookie = (cookie: OperationCookie, value: string, lifetimeMillis: number) =>
  Cookies.makeCookie(cookie.name, value, {
    ...cookie,
    httpOnly: true,
    maxAge: Duration.millis(lifetimeMillis)
  })

/** @internal */
export const cookieFits = (cookie: Cookies.Cookie): boolean =>
  new TextEncoder().encode(Cookies.serializeCookie(cookie)).byteLength <= maximumCookieBytes

const OptionalCookieValue = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(maximumCookieBytes),
  Schema.isPattern(/^[A-Za-z0-9._~-]+$/)
)

/**
 * Optional cache input has no authority. Missing or ambiguous pairs are misses.
 *
 * @internal
 */
export const optionalCookie = (pair: string | undefined, name: string): string | undefined => {
  if (pair === undefined || new TextEncoder().encode(pair).byteLength > maximumCookieBytes) {
    return undefined
  }
  const value = Cookies.parseHeader(pair)[name]

  return Schema.is(OptionalCookieValue)(value) ? value : undefined
}

/**
 * Cookies for a rotated mutation binding; failure prevents mutation admission.
 *
 * @internal
 */
export const rotationCookies = Effect.fnUntraced(function*(
  cookie: OperationCookie,
  generation: Redacted.Redacted<string>,
  lifetimeMillis: number
) {
  const binding = makeCacheCookie(
    generationCookieConfiguration(cookie),
    Redacted.value(generation),
    lifetimeMillis
  )

  const clear = makeCacheCookie(cookie, "", 0)

  if (
    binding._tag === "Failure" ||
    clear._tag === "Failure" ||
    !cookieFits(binding.success) ||
    !cookieFits(clear.success)
  ) {
    yield* reportAuthFailure("session-cache", Cause.fail(SessionUnavailable.make({})))

    return yield* SessionUnavailable.make({})
  }

  return [clear.success, binding.success]
})

/**
 * Optional snapshots must never turn authoritative success into a failure.
 * Check the same serialized cookie that both HTTP delivery paths will send.
 *
 * @internal
 */
export const snapshotCookie = Effect.fnUntraced(function*(
  cookie: OperationCookie,
  command: AuthCredentialCommand,
  nowMillis: number
) {
  const result = makeCacheCookie(
    cookie,
    command._tag === "Issue" ? Redacted.value(command.credential) : "",
    command._tag === "Issue" ? Math.max(0, command.expiresAtMillis - nowMillis) : 0
  )

  if (result._tag === "Success" && cookieFits(result.success)) return result.success
  yield* reportAuthFailure("session-cache", Cause.fail(SessionUnavailable.make({})))
  const clear = makeCacheCookie(cookie, "", 0)

  return clear._tag === "Success" && cookieFits(clear.success) ? clear.success : undefined
})
