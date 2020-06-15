// cause
import { died } from "../Cause/died"
import { failed } from "../Cause/failed"
import { pretty } from "../Cause/pretty"
// exit
import { FiberFailure } from "../Errors"
import { Exit } from "../Exit/exit"
// fiber
import { FiberContext } from "../Fiber/context"
import { newFiberId } from "../Fiber/id"
import { interruptible } from "../Fiber/interruptStatus"
import { Callback } from "../Fiber/state"
import { track } from "../Fiber/tracker"
// support

// effect
import { Effect, Async } from "./effect"

// empty function
const empty = () => {
  //
}

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export const unsafeRunAsync = <S, E, A>(
  _: Effect<S, {}, E, A>,
  cb?: Callback<E, A>
) => {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const context = new FiberContext<E, A>(fiberId, {}, initialIS, new Map())

  track(context)

  context.evaluateNow(_.asInstruction)
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
 * status 0. In the success scenario process exits with status 0 witout any log
 */
export const unsafeRunMain = <S, E>(effect: Effect<S, {}, E, void>): CancelMain => {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const context = new FiberContext<E, void>(fiberId, {}, initialIS, new Map())

  track(context)

  context.evaluateNow(effect.asInstruction)
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
      }
      // eslint-disable-next-line no-fallthrough
      case "Success": {
        process.exit(0)
      }
    }
  })

  return () => {
    unsafeRunAsync(context.interruptAs(fiberId))
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
export const unsafeRunAsyncCancelable = <S, E, A>(
  _: Effect<S, {}, E, A>,
  cb?: Callback<E, A>
): AsyncCancel<E, A> => {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const context = new FiberContext<E, A>(fiberId, {}, initialIS, new Map())

  track(context)

  context.evaluateNow(_.asInstruction)
  context.runAsync(cb || empty)

  return context.interruptAs(fiberId)
}

/**
 * Run effect as a Promise, throwing a FiberFailure containing the cause of exit
 * in case of error.
 */
export const unsafeRunPromise = <S, E, A>(_: Effect<S, {}, E, A>): Promise<A> => {
  const initialIS = interruptible
  const fiberId = newFiberId()
  const context = new FiberContext<E, A>(fiberId, {}, initialIS, new Map())

  track(context)

  context.evaluateNow(_.asInstruction)

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
