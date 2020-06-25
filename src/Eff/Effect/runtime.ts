// cause
import { died } from "../Cause/died"
import { failed } from "../Cause/failed"
import { pretty } from "../Cause/pretty"
// exit
import { Clock, liveClock } from "../Clock"
import { FiberFailure } from "../Errors"
import { Exit } from "../Exit/exit"
// fiber
import { FiberContext } from "../Fiber/context"
import { newFiberId } from "../Fiber/id"
import { interruptible } from "../Fiber/interruptStatus"
import { Callback, FiberStateDone } from "../Fiber/state"
// scope
import { Random, defaultRandom } from "../Random"
import * as Scope from "../Scope"
// supervisor
import * as Supervisor from "../Supervisor"

import { Async, Effect, _I } from "./effect"

// empty function
const empty = () => {
  //
}

export type DefaultEnv = Clock & Random

export const defaultEnv: Clock & Random = {
  ...liveClock,
  ...defaultRandom
}

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export const runAsync = <S, E, A>(
  _: Effect<S, DefaultEnv, E, A>,
  cb?: Callback<E, A>
) => {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])
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
export const runMain = <S, E>(effect: Effect<S, DefaultEnv, E, void>): CancelMain => {
  const context = fiberContext<E, void>()

  context.evaluateLater(effect[_I])
  context.runAsync((exit) => {
    switch (exit._tag) {
      case "Failure": {
        if (died(exit.cause) || failed(exit.cause)) {
          console.error(pretty(exit.cause))
          process.exit(2)
        } else {
          console.log(pretty(exit.cause))
          process.exit(0)
        }
        break
      }
      // eslint-disable-next-line no-fallthrough
      case "Success": {
        process.exit(0)
      }
    }
  })

  return () => {
    runAsync(context.interruptAs(context.id))
  }
}

/**
 * Effect Canceler
 */
export type AsyncCancel<E, A> = Async<Exit<E, A>>

/**
 * Runs effect until completion returing a cancel effecr that when executed
 * triggers cancellation of the process
 */
export const runAsyncCancel = <S, E, A>(
  _: Effect<S, DefaultEnv, E, A>,
  cb?: Callback<E, A>
): AsyncCancel<E, A> => {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])
  context.runAsync(cb || empty)

  return context.interruptAs(context.id)
}

/**
 * Run effect as a Promise, throwing a FiberFailure containing the cause of exit
 * in case of error.
 */
export const runPromise = <S, E, A>(_: Effect<S, DefaultEnv, E, A>): Promise<A> => {
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
export const runPromiseExit = <S, E, A>(
  _: Effect<S, DefaultEnv, E, A>
): Promise<Exit<E, A>> => {
  const context = fiberContext<E, A>()

  context.evaluateLater(_[_I])

  return new Promise((res) => {
    context.runAsync((exit) => {
      res(exit)
    })
  })
}

/**
 * Run effect as a synchronously, returning the full exit state
 */
export const runSyncExit = <E, A>(_: Effect<never, DefaultEnv, E, A>): Exit<E, A> => {
  const context = fiberContext<E, A>()

  context.evaluateNow(_[_I], true)

  const state = context.state.get as FiberStateDone<E, A>

  return state.value
}

/**
 * Run effect synchronously, throwing a FiberFailure containing the cause of exit
 * in case of error.
 */
export const runSync = <E, A>(_: Effect<never, DefaultEnv, E, A>): A => {
  const context = fiberContext<E, A>()

  context.evaluateNow(_[_I], true)

  const state = context.state.get as FiberStateDone<E, A>

  switch (state.value._tag) {
    case "Success": {
      return state.value.value
    }
    case "Failure": {
      throw new FiberFailure(state.value.cause)
    }
  }
}

function fiberContext<E, A>() {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const scope = Scope.unsafeMakeScope<Exit<E, A>>()
  const supervisor = Supervisor.none

  const context = new FiberContext<E, A>(
    fiberId,
    defaultEnv,
    initialIS,
    new Map(),
    supervisor,
    scope
  )
  return context
}
