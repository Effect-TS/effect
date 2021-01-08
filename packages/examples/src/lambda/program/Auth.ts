import * as T from "@effect-ts/core/Effect"
import * as L from "@effect-ts/core/Effect/Layer"
import { literal, pipe } from "@effect-ts/core/Function"
import { tag } from "@effect-ts/core/Has"
import type { _A } from "@effect-ts/core/Utils"

/**
 * Simulates a service that perform some sort of authentication
 */
const makeAuth = T.gen(function* (_) {
  const login = yield* _(
    pipe(
      T.effectTotal(() => "service_token"),
      // simulate load...
      T.delay(3_000),
      // cache the calls to this effect for 1 minute
      T.cached(60_000)
    )
  )

  return {
    // discriminate AuthService from any other service at the type level
    _tag: literal("@app/AuthService"),
    login
  }
})

/**
 * Derives the type of AuthService from the return type of makeAuthService
 */
export interface Auth extends _A<typeof makeAuth> {}

/**
 * Tag to access and provide AuthService
 */
export const Auth = tag<Auth>()

/**
 * Live AuthService Layer
 */
export const LiveAuth = L.fromEffect(Auth)(makeAuth)

/**
 * Utility functions
 */
export const login = T.accessServiceM(Auth)(({ login }) => login)
