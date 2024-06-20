/**
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type { RuntimeFiber } from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { pipe } from "effect/Function"
import type * as Scheduler from "effect/Scheduler"

/**
 * @since 1.0.0
 */
export class CrashableRuntimeCrashedError
  extends Data.TaggedClass("@effect/cluster-workflow/CrashableRuntimeCrashedError")<{}>
{}

/**
 * @since 1.0.0
 */
export function isCrashableRuntimeCrashedError(value: unknown): value is CrashableRuntimeCrashedError {
  return typeof value === "object" && value !== null && "_tag" in value &&
    value._tag === "@effect/cluster-workflow/CrashableRuntimeCrashedError"
}

/**
 * @since 1.0.0
 */
export class CrashableRuntimeScheduler implements Scheduler.Scheduler {
  /**
   * @since 1.0.0
   */
  crashed: boolean = false

  constructor(readonly baseScheduler: Scheduler.Scheduler) {}

  /**
   * @since 1.0.0
   */
  shouldYield(fiber: RuntimeFiber<unknown, unknown>): number | false {
    if (this.crashed) return 1
    return this.baseScheduler.shouldYield(fiber)
  }

  /**
   * @since 1.0.0
   */
  scheduleTask(task: Scheduler.Task, priority: number): void {
    if (this.crashed) return
    return this.baseScheduler.scheduleTask(task, priority)
  }

  /**
   * @since 1.0.0
   */
  crash() {
    this.crashed = true
  }
}

/**
 * @since 1.0.0
 */
export interface CrashableRuntime {
  /**
   * @since 1.0.0
   */
  crash: Effect.Effect<void>

  /**
   * @since 1.0.0
   */
  run: <A, E, R>(
    fn: (restore: <A2, E2, R2>(fa: Effect.Effect<A2, E2, R2>) => Effect.Effect<A2, E2, R2>) => Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | CrashableRuntimeCrashedError, R>
}

/**
 * @since 1.0.0
 */
export const make = pipe(
  FiberRef.get(FiberRef.currentScheduler),
  Effect.flatMap((baseScheduler) =>
    pipe(
      Deferred.make<never, CrashableRuntimeCrashedError>(),
      Effect.map((latch) => {
        const crashableScheduler = new CrashableRuntimeScheduler(baseScheduler)
        const restore = <R, E, A>(fa: Effect.Effect<A, E, R>) => pipe(fa, Effect.withScheduler(baseScheduler))

        const runtime: CrashableRuntime = {
          crash: restore(pipe(
            Effect.sync(() => crashableScheduler.crash()),
            Effect.zipRight(Deferred.fail(latch, new CrashableRuntimeCrashedError())),
            Effect.asVoid
          )),
          run: (fn) =>
            pipe(
              fn(restore),
              Effect.withScheduler(crashableScheduler),
              Effect.forkDaemon,
              Effect.flatMap((fiber) => Effect.raceFirst(Effect.disconnect(fiber.await), Deferred.await(latch))),
              Effect.flatten
            )
        }

        return runtime
      })
    )
  )
)

/**
 * @since 1.0.0
 */
export function retryWhileCrashes<R, E, A>(
  fn: (runtime: CrashableRuntime) => Effect.Effect<R, E | CrashableRuntimeCrashedError, A>
): Effect.Effect<R, Exclude<E, CrashableRuntimeCrashedError>, A> {
  return pipe(
    make,
    Effect.flatMap(fn),
    Effect.retry({ while: isCrashableRuntimeCrashedError })
  ) as any
}

/**
 * @since 1.0.0
 */
export function runWithCrash<R, E, A>(
  fn: (crash: Effect.Effect<never>) => Effect.Effect<R, E | CrashableRuntimeCrashedError, A>
): Effect.Effect<R, E | CrashableRuntimeCrashedError, A> {
  return pipe(
    make,
    Effect.flatMap((runtime) => runtime.run(() => fn(runtime.crash as any)))
  )
}
