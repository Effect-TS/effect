import { constVoid, identity } from "../../data/Function"
import { Option } from "../../data/Option"
import { Stack } from "../../data/Stack"
import * as Supervisor from "../../io/Supervisor"
import { OneShot } from "../../support/OneShot"
import type { Effect } from "../Effect"
import type { Exit } from "../Exit"
import { FiberContext } from "../Fiber/_internal/context"
import { FiberId } from "../FiberId"
import { FiberRef } from "../FiberRef"
import { InterruptStatus } from "../InterruptStatus"
import type { RuntimeConfig } from "../RuntimeConfig"
import * as Scope from "../Scope"
import { TraceElement } from "../TraceElement"

export class Runtime<R> {
  constructor(readonly environment: R, readonly runtimeConfig: RuntimeConfig) {}

  unsafeRunWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): ((fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void) => {
    const fiberId = FiberId.unsafeMake(TraceElement.parse(__tsplusTrace))

    const children = new Set<FiberContext<any, any>>()

    const supervisor = this.runtimeConfig.value.supervisor

    const fiberRefLocals = new Map([
      [FiberRef.currentEnvironment.value, this.environment]
    ])

    const context: FiberContext<E, A> = new FiberContext(
      fiberId,
      fiberRefLocals,
      children,
      this.runtimeConfig,
      new Stack(InterruptStatus.Interruptible.toBoolean)
    )

    Scope.globalScope.value.unsafeAdd(this.runtimeConfig, context)

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.environment, effect, Option.none, context)

      context.unsafeOnDone((exit) => supervisor.unsafeOnEnd(exit.flatten(), context))
    }

    context.nextEffect = effect
    context.run()
    context.unsafeOnDone((exit) => {
      k(exit.flatten())
    })

    return (id) => (k) =>
      this.unsafeRunAsyncWith(context.interruptAs(id), (exit) => k(exit.flatten()))
  }

  /**
   * Executes the effect asynchronously, discarding the result of execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsync = <E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string): void => {
    return this.unsafeRunAsyncWith(effect, constVoid)
  }

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): void => {
    this.unsafeRunAsyncCancelable(effect, k)
  }

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback. It returns a callback, which can be used to
   * interrupt the running execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncCancelable = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): ((fiberId: FiberId) => Exit<E, A>) => {
    const current = effect
    const canceler = this.unsafeRunWith(current, k)
    return (fiberId) => {
      const result = new OneShot<Exit<E, A>>()
      canceler(fiberId)(result.set)
      return result.get()
    }
  }

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the value of the effect once the effect has been executed, or will be
   * rejected with the first error or exception throw by the effect.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromise = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Promise<A> => {
    return new Promise((resolve, reject) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        switch (exit._tag) {
          case "Success": {
            resolve(exit.value)
            break
          }
          case "Failure": {
            reject(exit.cause.squashWith(identity))
            break
          }
        }
      })
    })
  }

  /**
   * Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
   * with the `Exit` state of the effect once the effect has been executed.
   *
   * This method is effectful and should only be used at the edges of your
   * program.
   */
  unsafeRunPromiseExit = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Promise<Exit<E, A>> => {
    return new Promise((resolve) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        resolve(exit)
      })
    })
  }
}
