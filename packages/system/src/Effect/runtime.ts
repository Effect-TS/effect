// option
// cause
import * as Cause from "../Cause/core"
import { FiberFailure } from "../Cause/errors"
import { pretty } from "../Cause/pretty"
// exit
import { HasClock, LiveClock } from "../Clock"
import type { Exit } from "../Exit/exit"
// fiber
import { FiberContext } from "../Fiber/context"
import { interruptible } from "../Fiber/core"
import { newFiberId } from "../Fiber/id"
import type { Callback } from "../Fiber/state"
import { constVoid } from "../Function"
import * as O from "../Option"
import { defaultRandom, HasRandom } from "../Random"
import * as Scope from "../Scope"
// supervisor
import * as Supervisor from "../Supervisor"
import type { FailureReporter } from "."
import { accessM, chain_, effectTotal, succeed } from "./core"
import type { Effect, UIO } from "./effect"
import { _I } from "./effect"
import { provideSome_ } from "./provideSome"

// empty function
const empty = () => {
  //
}

export type DefaultEnv = HasClock & HasRandom

export function defaultEnv() {
  return {
    [HasClock.key]: new LiveClock(),
    [HasRandom.key]: defaultRandom
  }
}

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export function run<E, A>(_: Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])
  context.runAsync(cb || empty)
}

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export function runAsap<E, A>(_: Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) {
  const context = fiberContext<E, A>()

  context.evaluateNow(_[_I])
  context.runAsync(cb || empty)
}

export interface CancelMain {
  (): void
}

/**
 * Runs effect until completion returing a cancel function that when invoked
 * triggers cancellation of the process, in case errors are found process will
 * exit with a status of 2 and cause will be pretty printed, if interruption
 * is found without errors the cause is pretty printed and process exits with
 * status 0. In the success scenario process exits with status 0 witout any log.
 *
 * Note: this should be used only in node.js as it depends on process.exit
 */
export function runMain<E>(effect: Effect<DefaultEnv, E, void>): CancelMain {
  const context = fiberContext<E, void>()

  context.evaluateLater(effect[_I])
  context.runAsync((exit) => {
    switch (exit._tag) {
      case "Failure": {
        if (Cause.died(exit.cause) || Cause.failed(exit.cause)) {
          console.error(pretty(exit.cause))
          process.exit(2)
        } else {
          console.log(pretty(exit.cause))
          process.exit(0)
        }
      }
      // eslint-disable-next-line no-fallthrough
      case "Success": {
        process.exit(0)
      }
    }
  })

  return () => {
    run(context.interruptAs(context.id))
  }
}

/**
 * Effect Canceler
 */
export type AsyncCancel<E, A> = UIO<Exit<E, A>>

/**
 * Runs effect until completion returing a cancel effecr that when executed
 * triggers cancellation of the process
 */
export function runCancel<E, A>(
  _: Effect<DefaultEnv, E, A>,
  cb?: Callback<E, A>
): AsyncCancel<E, A> {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])
  context.runAsync(cb || empty)

  return context.interruptAs(context.id)
}

/**
 * Run effect as a Promise, throwing a FiberFailure containing the cause of exit
 * in case of error.
 */
export function runPromise<E, A>(_: Effect<DefaultEnv, E, A>): Promise<A> {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])

  return new Promise((res, rej) => {
    context.runAsync((exit) => {
      switch (exit._tag) {
        case "Success": {
          res(exit.value)
          break
        }
        case "Failure": {
          rej(new FiberFailure(exit.cause))
          break
        }
      }
    })
  })
}

/**
 * Run effect as a Promise of the Exit state
 * in case of error.
 */
export function runPromiseExit<E, A>(_: Effect<DefaultEnv, E, A>): Promise<Exit<E, A>> {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])

  return new Promise((res) => {
    context.runAsync((exit) => {
      res(exit)
    })
  })
}

export const prettyReporter: FailureReporter = O.some((e) => {
  console.error(pretty(e))
})

export function fiberContext<E, A>() {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const scope = Scope.unsafeMakeScope<Exit<E, A>>()
  const supervisor = Supervisor.none

  const context = new FiberContext<E, A>(
    fiberId,
    defaultEnv(),
    initialIS,
    new Map(),
    supervisor,
    scope,
    10_000,
    constVoid
  )

  return context
}

/**
 * Represent an environment providing function
 */
export interface Runtime<R0> {
  in: <R, E, A>(effect: Effect<R & R0, E, A>) => Effect<R, E, A>
  run: <E, A>(_: Effect<DefaultEnv & R0, E, A>, cb?: Callback<E, A> | undefined) => void
  runCancel: <E, A>(
    _: Effect<DefaultEnv & R0, E, A>,
    cb?: Callback<E, A> | undefined
  ) => UIO<Exit<E, A>>
  runPromise: <E, A>(_: Effect<DefaultEnv & R0, E, A>) => Promise<A>
  runPromiseExit: <E, A>(_: Effect<DefaultEnv & R0, E, A>) => Promise<Exit<E, A>>
}

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export function runtime<R0>() {
  return accessM((r0: R0) =>
    effectTotal(
      (): Runtime<R0> => {
        return makeRuntime<R0>(r0)
      }
    )
  )
}

export function withRuntimeM<R0, R, E, A>(f: (r: Runtime<R0>) => Effect<R, E, A>) {
  return chain_(runtime<R0>(), f)
}

export function withRuntime<R0, A>(f: (r: Runtime<R0>) => A) {
  return chain_(runtime<R0>(), (r) => succeed(f(r)))
}

export function makeRuntime<R0>(r0: R0): Runtime<R0> {
  return {
    in: <R, E, A>(effect: Effect<R & R0, E, A>) =>
      provideSome_(effect, (r: R) => ({ ...r0, ...r })),
    run: (_, cb) =>
      run(
        provideSome_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runCancel: (_, cb) =>
      runCancel(
        provideSome_(_, (r) => ({ ...r0, ...r })),
        cb
      ),
    runPromise: (_) => runPromise(provideSome_(_, (r) => ({ ...r0, ...r }))),
    runPromiseExit: (_) => runPromiseExit(provideSome_(_, (r) => ({ ...r0, ...r })))
  }
}
