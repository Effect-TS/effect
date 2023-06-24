import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as V from "vitest"

export type API = V.TestAPI<{}>

export const it: API = V.it

export const effect = (() => {
  const f = <E, A>(
    name: string,
    self: () => Effect.Effect<never, E, A>,
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
      self: () => Effect.Effect<never, E, A>,
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
      self: () => Effect.Effect<never, E, A>,
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
