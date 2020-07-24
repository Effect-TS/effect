import { tuple } from "../../Function"
import { Cause, pretty } from "../Cause"
import * as T from "../Effect"
import { _I } from "../Effect/effect"
import * as E from "../Exit"
import { Callback } from "../Fiber/state"
import * as L from "../Layer"
import { internalEffect, releaseAll } from "../Managed/internals"
import { makeReleaseMap } from "../Managed/releaseMap"
import * as P from "../Promise"
import { AtomicReference } from "../Support/AtomicReference"

export interface GlobalRuntime<R0> extends Omit<T.Runtime<R0>, "in"> {}

/**
 * Notes:
 * this works only on Node.js
 * this method is effectful it should only run once and will trigger env construction
 */
export const globalRuntime = <S, E, ROut>(
  layer: L.Layer<S, T.DefaultEnv, E, ROut>,
  onError: (e: Cause<E>) => void = (e) => {
    console.error(pretty(e))
    process.exit(2)
  }
): GlobalRuntime<ROut> => {
  const rm = T.runSync(makeReleaseMap)

  const envP = T.runSync(P.make<never, ROut>())

  const envNotReady: T.Sync<ROut> = T.die("environment not ready")
  const envFailed: T.Sync<ROut> = T.die("environment construction failed")

  const envS = new AtomicReference<T.Sync<ROut>>(envNotReady)

  const envE = T.map_(
    T.accessM((r: T.DefaultEnv) =>
      T.provideAll_(internalEffect(layer.build), tuple(r, rm))
    ),
    (a) => a[1]
  )

  const fc = T.fiberContext<E, ROut>()

  fc.evaluateNow(envE[_I])

  fc.runAsync((ex) => {
    if (ex._tag === "Failure") {
      onError(ex.cause)

      envS.set(envFailed)
      T.runAsyncAsap(P.complete(envFailed)(envP))
    } else {
      const released = new AtomicReference(false)
      process.on("beforeExit", () => {
        if (!released.get) {
          released.set(true)
          T.runPromiseExit(releaseAll(rm, E.succeed(undefined)))
        }
      })

      envS.set(T.done(ex))
      T.runAsyncAsap(P.complete(T.done(ex))(envP))
    }
  })

  const runAsyncCancel = <S, E2, A>(
    eff: T.Effect<S, ROut & T.DefaultEnv, E2, A>,
    cb?: Callback<E2, A>
  ) =>
    T.runAsyncCancel(
      T.chain_(P.wait(envP), (r) => T.provide(r)(eff)),
      cb
    )

  const runAsync = <S, E2, A>(
    eff: T.Effect<S, ROut & T.DefaultEnv, E2, A>,
    cb?: Callback<E2, A>
  ) =>
    T.runAsync(
      T.chain_(P.wait(envP), (r) => T.provide(r)(eff)),
      cb
    )

  const runPromise = <S, E2, A>(eff: T.Effect<S, ROut & T.DefaultEnv, E2, A>) =>
    T.runPromise(T.chain_(P.wait(envP), (r) => T.provide(r)(eff)))

  const runPromiseExit = <S, E2, A>(eff: T.Effect<S, ROut & T.DefaultEnv, E2, A>) =>
    T.runPromiseExit(T.chain_(P.wait(envP), (r) => T.provide(r)(eff)))

  const runSync = <E2, A>(eff: T.Effect<never, ROut & T.DefaultEnv, E2, A>) =>
    T.runSync(T.chain_(envS.get, (r) => T.provide(r)(eff)))

  const runSyncExit = <E2, A>(eff: T.Effect<never, ROut & T.DefaultEnv, E2, A>) =>
    T.runSyncExit(T.chain_(envS.get, (r) => T.provide(r)(eff)))

  return {
    runAsyncCancel,
    runAsync,
    runPromise,
    runPromiseExit,
    runSync,
    runSyncExit
  }
}
