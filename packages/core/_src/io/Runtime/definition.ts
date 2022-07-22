import { FiberContext } from "@effect/core/io/Fiber/_internal/context"
import { StagedScheduler } from "@effect/core/support/Scheduler"
import { constVoid } from "@tsplus/stdlib/data/Function"

export class AsyncFiber<E, A> {
  readonly _tag = "AsyncFiber"
  constructor(readonly fiber: FiberContext<E, A>) {}
}

export class Runtime<R> {
  constructor(readonly environment: Env<R>, readonly runtimeConfig: RuntimeConfig, readonly fiberRefs: FiberRefs) {}

  unsafeRunWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void,
    __tsplusTrace?: string
  ): ((fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void) => {
    const fiberId = FiberId.unsafeMake(TraceElement.parse(__tsplusTrace))

    const children = new Set<FiberContext<any, any>>()

    const supervisor = this.runtimeConfig.value.supervisor

    const fiberRefs = this.fiberRefs
      .updateAs(
        fiberId,
        FiberRef.currentEnvironment,
        this.environment as Env<never>
      )

    const context: FiberContext<E, A> = new FiberContext(
      fiberId,
      children,
      fiberRefs,
      this.runtimeConfig,
      new Stack(InterruptStatus.Interruptible.toBoolean)
    )

    FiberScope.global.unsafeAdd(this.runtimeConfig, context)

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.environment, effect, Maybe.none, context)

      context.unsafeOnDone((exit) => supervisor.unsafeOnEnd(exit.flatten, context))
    }

    context.nextEffect = effect
    context.run()
    context.unsafeOnDone((exit) => {
      k(exit.flatten)
    })

    return (id) => (k) => this.unsafeRunAsyncWith(context._interruptAs(id), (exit) => k(exit.flatten))
  }

  unsafeRunSync = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): A => {
    const exit = this.unsafeRunSyncExit(effect)
    if (exit._tag === "Failure") {
      throw exit.cause.squashWith(identity)
    }
    return exit.value
  }

  unsafeRunSyncExit = <E, A>(
    effect: Effect<R, E, A>,
    __tsplusTrace?: string
  ): Exit<E, A> => {
    const fiberId = FiberId.unsafeMake(TraceElement.parse(__tsplusTrace))

    const children = new Set<FiberContext<any, any>>()

    const supervisor = this.runtimeConfig.value.supervisor

    const scheduler = new StagedScheduler()

    const fiberRefs = this.fiberRefs
      .updateAs(
        fiberId,
        FiberRef.currentEnvironment,
        this.environment as Env<never>
      )
      .updateAs(
        fiberId,
        FiberRef.currentScheduler,
        scheduler
      )

    const context: FiberContext<E, A> = new FiberContext(
      fiberId,
      children,
      fiberRefs,
      this.runtimeConfig,
      new Stack(InterruptStatus.Interruptible.toBoolean)
    )

    FiberScope.global.unsafeAdd(this.runtimeConfig, context)

    if (supervisor !== Supervisor.none) {
      supervisor.unsafeOnStart(this.environment, effect, Maybe.none, context)

      context.unsafeOnDone((exit) => supervisor.unsafeOnEnd(exit.flatten, context))
    }

    context.nextEffect = effect
    context.run()
    scheduler.flush()

    const result = context.unsafePoll()

    if (result.isSome()) {
      return result.value
    }

    return Exit.die(new AsyncFiber(context))
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
    this.unsafeRunWith(effect, k)
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
