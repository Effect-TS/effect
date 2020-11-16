import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import * as L from "@effect-ts/core/Effect/Layer"
import * as RM from "@effect-ts/core/Effect/Managed/ReleaseMap"
import * as Pr from "@effect-ts/core/Effect/Promise"
import { pipe, tuple } from "@effect-ts/core/Function"
import { None } from "@effect-ts/system/Fiber"

export interface TestRuntime<R> {
  it: <E, A>(name: string, self: () => T.Effect<R & T.DefaultEnv, E, A>) => void
  runPromise: <E, A>(self: T.Effect<R & T.DefaultEnv, E, A>) => Promise<A>
  runPromiseExit: <E, A>(
    self: T.Effect<R & T.DefaultEnv, E, A>
  ) => Promise<Ex.Exit<E, A>>
  provide: <R2, E, A>(self: T.Effect<R & R2, E, A>) => T.Effect<R2, E, A>
}

export function testRuntime<R, E>(
  self: L.Layer<T.DefaultEnv, E, R>,
  {
    close = 120_000,
    open = 120_000
  }: {
    open?: number
    close?: number
  } = {}
): TestRuntime<R> {
  const promiseEnv = Pr.unsafeMake<never, R>(None)
  const promiseRelMap = Pr.unsafeMake<never, RM.ReleaseMap>(None)

  beforeAll(
    () =>
      pipe(
        T.do,
        T.bind("rm", () => RM.makeReleaseMap),
        T.tap(({ rm }) => pipe(promiseRelMap, Pr.succeed(rm))),
        T.bind("res", ({ rm }) =>
          T.provideSome_(L.build(self).effect, (r: T.DefaultEnv) => tuple(r, rm))
        ),
        T.map(({ res }) => res[1]),
        T.result,
        T.chain((ex) => pipe(promiseEnv, Pr.complete(T.orDie(T.done(ex))))),
        T.runPromise
      ),
    open
  )

  afterAll(
    () =>
      pipe(
        promiseRelMap,
        Pr.await,
        T.chain((rm) => RM.releaseAll(Ex.succeed(undefined), T.sequential)(rm)),
        T.runPromise
      ),
    close
  )

  return {
    it: (name, self) =>
      it(name, () =>
        pipe(
          promiseEnv,
          Pr.await,
          T.chain((r) => T.provide(r)(self())),
          T.runPromise
        )
      ),
    runPromise: (self) =>
      pipe(
        promiseEnv,
        Pr.await,
        T.chain((r) => T.provide(r)(self)),
        T.runPromise
      ),
    runPromiseExit: (self) =>
      pipe(
        promiseEnv,
        Pr.await,
        T.chain((r) => T.provide(r)(self)),
        T.runPromiseExit
      ),
    provide: (self) =>
      pipe(
        promiseEnv,
        Pr.await,
        T.chain((r) => T.provide(r)(self))
      )
  }
}
