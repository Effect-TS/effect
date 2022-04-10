// ets_tracing: off

import * as Cause from "../Cause"
import type { Effect } from "../Effect"
import type { Exit } from "../Exit"
import * as Ex from "../Exit"
import { FiberContext } from "../Fiber/context"
import * as FiberId from "../FiberId"
import * as FiberRef from "../FiberRef"
import { constVoid, identity } from "../Function"
import * as InterruptStatus from "../InterruptStatus"
import * as O from "../Option"
import type { RuntimeConfig } from "../RuntimeConfig"
import * as Scope from "../Scope"
import { Stack } from "../Stack"
import * as Supervisor from "../Supervisor"
import { OneShot } from "../Support/OneShot"
import * as TraceElement from "../TraceElement"

export class Runtime<R> {
  constructor(readonly environment: R, readonly runtimeConfig: RuntimeConfig) {
    this.unsafeRunWith = this.unsafeRunWith.bind(this)
    this.unsafeRunAsync = this.unsafeRunAsync.bind(this)
    this.unsafeRunAsyncWith = this.unsafeRunAsyncWith.bind(this)
    this.unsafeRunAsyncCancelable = this.unsafeRunAsyncCancelable.bind(this)
    this.unsafeRunPromise = this.unsafeRunPromise.bind(this)
    this.unsafeRunPromiseExit = this.unsafeRunPromiseExit.bind(this)
  }

  unsafeRunWith<E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __trace?: string
  ): (fiberId: FiberId.FiberId) => (_: (exit: Exit<E, A>) => void) => void {
    const fiberId = FiberId.unsafeMake()

    const children = new Set<FiberContext<any, any>>()

    const supervisor = this.runtimeConfig.value.supervisor

    const fiberRefLocals = new Map([
      [FiberRef.currentEnvironment.value, this.environment]
    ])

    const context: FiberContext<E, A> = new FiberContext(
      fiberId,
      fiberRefLocals,
      TraceElement.parse(__trace),
      children,
      this.runtimeConfig,
      new Stack(InterruptStatus.Interruptible.toBoolean)
    )

    Scope.globalScope.unsafeAdd(this.runtimeConfig, context)

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.environment, effect, O.none, context)

      context.unsafeOnDone((exit) => supervisor.unsafeOnEnd(Ex.flatten(exit), context))
    }

    context.nextEffect = effect
    context.run()
    context.unsafeOnDone((exit) => {
      k(Ex.flatten(exit))
    })

    return (id) => (k) =>
      this.unsafeRunAsyncWith(
        context.interruptAs(id),
        (exit) => k(Ex.flatten(exit)),
        __trace
      )
  }

  /**
   * Executes the effect asynchronously, discarding the result of execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsync<E, A>(effect: Effect<R, E, A>, __trace?: string): void {
    return this.unsafeRunAsyncWith(effect, constVoid, __trace)
  }

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncWith<E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __trace?: string
  ): void {
    this.unsafeRunAsyncCancelable(effect, k, __trace)
  }

  /**
   * Executes the effect asynchronously, eventually passing the exit value to
   * the specified callback. It returns a callback, which can be used to
   * interrupt the running execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsyncCancelable<E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __trace?: string
  ): (fiberId: FiberId.FiberId) => Exit<E, A> {
    const current = effect
    const canceler = this.unsafeRunWith(current, k, __trace)
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
  unsafeRunPromise<E, A>(effect: Effect<R, E, A>, __trace?: string): Promise<A> {
    return new Promise((resolve, reject) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        switch (exit._tag) {
          case "Success": {
            resolve(exit.value)
            break
          }
          case "Failure": {
            reject(Cause.squashWith_(exit.cause, identity))
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
  unsafeRunPromiseExit<E, A>(
    effect: Effect<R, E, A>,
    __trace?: string
  ): Promise<Exit<E, A>> {
    return new Promise((resolve) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        resolve(exit)
      })
    })
  }
}
