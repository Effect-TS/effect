import * as V from "@effect/vitest"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

export type API = V.API

export const it: API = V.it

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<A, E>,
    timeout = 5_000
  ) => {
    return it(
      name,
      () =>
        pipe(
          Effect.suspend(self),
          Effect.runPromise
        ),
      timeout
    )
  }
  return Object.assign(f, {
    skip: <E, A>(
      name: string,
      self: () => Effect.Effect<A, E>,
      timeout = 5_000
    ) => {
      return it.skip(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.runPromise
          ),
        timeout
      )
    },
    only: <E, A>(
      name: string,
      self: () => Effect.Effect<A, E>,
      timeout = 5_000
    ) => {
      return it.only(
        name,
        () =>
          pipe(
            Effect.suspend(self),
            Effect.runPromise
          ),
        timeout
      )
    }
  })
})()
