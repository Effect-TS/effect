import { FiberRuntime } from "@effect/core/io/Fiber/_internal/runtime"
import { StagedScheduler } from "@effect/core/support/Scheduler"
import type { Context } from "@fp-ts/data/Context"
import { constVoid, identity } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * @category model
 * @since 1.0.0
 */
export class AsyncFiber<E, A> {
  readonly _tag = "AsyncFiber"
  constructor(readonly fiber: FiberRuntime<E, A>) {}
}

/**
 * @category model
 * @since 1.0.0
 */
export class Runtime<R> {
  constructor(
    readonly environment: Context<R>,
    readonly runtimeFlags: RuntimeFlags,
    readonly fiberRefs: FiberRefs
  ) {}

  unsafeFork = <E, A>(effect: Effect<R, E, A>) => {
    const fiberId = FiberId.unsafeMake()

    const fiberRefs = this.fiberRefs
      .updateAs(
        fiberId,
        FiberRef.currentEnvironment,
        this.environment as Context<never>
      )

    const context = new FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = context.getSupervisor

    if (supervisor != Supervisor.none) {
      supervisor.onStart(this.environment, effect, Option.none, context)

      context.addObserver(exit => supervisor.onEnd(exit, context))
    }

    context.start(effect)

    FiberScope.global.add(this.runtimeFlags, context)

    return context
  }

  unsafeRunWith = <E, A>(
    effect: Effect<R, E, A>,
    k: (exit: Exit<E, A>) => void
  ): ((fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void) => {
    const fiberId = FiberId.unsafeMake()

    const fiberRefs = this.fiberRefs
      .updateAs(
        fiberId,
        FiberRef.currentEnvironment,
        this.environment as Context<never>
      )

    const context = new FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = context.getSupervisor

    if (supervisor != Supervisor.none) {
      supervisor.onStart(this.environment, effect, Option.none, context)

      context.addObserver(exit => supervisor.onEnd(exit, context))
    }

    context.start(effect)

    FiberScope.global.add(this.runtimeFlags, context)

    context.addObserver((exit) => {
      k(exit)
    })

    return (id) =>
      (k) => this.unsafeRunAsyncWith(context.interruptAs(id), (exit) => k(exit.flatten))
  }

  unsafeRunSync = <E, A>(
    effect: Effect<R, E, A>
  ): A => {
    const exit = this.unsafeRunSyncExit(effect)
    if (exit._tag === "Failure") {
      throw exit.cause.squashWith(identity)
    }
    return exit.value
  }

  unsafeRunSyncExit = <E, A>(
    effect: Effect<R, E, A>
  ): Exit<E, A> => {
    const fiberId = FiberId.unsafeMake()

    const scheduler = new StagedScheduler()

    const fiberRefs = this.fiberRefs
      .updateAs(
        fiberId,
        FiberRef.currentEnvironment,
        this.environment as Context<never>
      )
      .updateAs(
        fiberId,
        FiberRef.currentScheduler,
        scheduler
      )

    const context = new FiberRuntime<E, A>(
      fiberId,
      fiberRefs,
      this.runtimeFlags
    )

    const supervisor = context.getSupervisor

    if (supervisor != Supervisor.none) {
      supervisor.onStart(this.environment, effect, Option.none, context)

      context.addObserver(exit => supervisor.onEnd(exit, context))
    }

    context.start(effect)

    FiberScope.global.add(this.runtimeFlags, context)

    scheduler.flush()

    const result = context.unsafePoll

    if (result) {
      return result
    }

    return Exit.die(new AsyncFiber(context))
  }

  /**
   * Executes the effect asynchronously, discarding the result of execution.
   *
   * This method is effectful and should only be invoked at the edges of your
   * program.
   */
  unsafeRunAsync = <E, A>(effect: Effect<R, E, A>): void => {
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
    k: (exit: Exit<E, A>) => void
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
    effect: Effect<R, E, A>
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
    effect: Effect<R, E, A>
  ): Promise<Exit<E, A>> => {
    return new Promise((resolve) => {
      this.unsafeRunAsyncWith(effect, (exit) => {
        resolve(exit)
      })
    })
  }
}
