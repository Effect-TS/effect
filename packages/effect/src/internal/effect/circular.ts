import type * as Cause from "../../Cause.js"
import type * as Deferred from "../../Deferred.js"
import * as Duration from "../../Duration.js"
import type * as Effect from "../../Effect.js"
import * as Either from "../../Either.js"
import * as Equal from "../../Equal.js"
import type { Equivalence } from "../../Equivalence.js"
import * as Exit from "../../Exit.js"
import type * as Fiber from "../../Fiber.js"
import * as FiberId from "../../FiberId.js"
import type * as FiberRefsPatch from "../../FiberRefsPatch.js"
import type { LazyArg } from "../../Function.js"
import { dual, pipe } from "../../Function.js"
import * as Hash from "../../Hash.js"
import * as MutableHashMap from "../../MutableHashMap.js"
import * as Option from "../../Option.js"
import { pipeArguments } from "../../Pipeable.js"
import * as Predicate from "../../Predicate.js"
import type * as Ref from "../../Ref.js"
import type * as Schedule from "../../Schedule.js"
import { currentScheduler } from "../../Scheduler.js"
import type * as Scope from "../../Scope.js"
import type * as Supervisor from "../../Supervisor.js"
import type * as Synchronized from "../../SynchronizedRef.js"
import * as internalCause from "../cause.js"
import * as effect from "../core-effect.js"
import * as core from "../core.js"
import * as executionStrategy from "../executionStrategy.js"
import * as internalFiber from "../fiber.js"
import * as fiberRuntime from "../fiberRuntime.js"
import { globalScope } from "../fiberScope.js"
import * as internalRef from "../ref.js"
import * as _schedule from "../schedule.js"
import * as supervisor from "../supervisor.js"

/** @internal */
class Semaphore {
  public waiters = new Array<() => void>()
  public taken = 0

  constructor(readonly permits: number) {}

  get free() {
    return this.permits - this.taken
  }

  readonly take = (n: number): Effect.Effect<number> =>
    core.asyncEither<number, never, never>((resume) => {
      if (this.free < n) {
        const observer = () => {
          if (this.free >= n) {
            const observerIndex = this.waiters.findIndex((cb) => cb === observer)
            if (observerIndex !== -1) {
              this.waiters.splice(observerIndex, 1)
            }
            this.taken += n
            resume(core.succeed(n))
          }
        }
        this.waiters.push(observer)
        return Either.left(core.sync(() => {
          const observerIndex = this.waiters.findIndex((cb) => cb === observer)
          if (observerIndex !== -1) {
            this.waiters.splice(observerIndex, 1)
          }
        }))
      }
      this.taken += n
      return Either.right(core.succeed(n))
    })

  readonly release = (n: number): Effect.Effect<void> =>
    core.withFiberRuntime((fiber) => {
      this.taken -= n
      fiber.getFiberRef(currentScheduler).scheduleTask(() => {
        this.waiters.forEach((wake) => wake())
      }, fiber.getFiberRef(core.currentSchedulingPriority))
      return core.unit
    })

  readonly withPermits = (n: number) => <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    core.uninterruptibleMask((restore) =>
      core.flatMap(
        restore(this.take(n)),
        (permits) => fiberRuntime.ensuring(restore(self), this.release(permits))
      )
    )
}

/** @internal */
export const unsafeMakeSemaphore = (permits: number): Semaphore => new Semaphore(permits)

/** @internal */
export const makeSemaphore = (permits: number) => core.sync(() => unsafeMakeSemaphore(permits))

/** @internal */
export const awaitAllChildren = <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  ensuringChildren(self, fiberRuntime.fiberAwaitAll)

/** @internal */
export const cached: {
  (
    timeToLive: Duration.DurationInput
  ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<Effect.Effect<A, E>, never, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    timeToLive: Duration.DurationInput
  ): Effect.Effect<Effect.Effect<A, E>, never, R>
} = dual(
  2,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    timeToLive: Duration.DurationInput
  ): Effect.Effect<Effect.Effect<A, E>, never, R> =>
    core.map(cachedInvalidateWithTTL(self, timeToLive), (tuple) => tuple[0])
)

/** @internal */
export const cachedInvalidateWithTTL: {
  (timeToLive: Duration.DurationInput): <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<[Effect.Effect<A, E>, Effect.Effect<void>], never, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    timeToLive: Duration.DurationInput
  ): Effect.Effect<[Effect.Effect<A, E>, Effect.Effect<void>], never, R>
} = dual(
  2,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    timeToLive: Duration.DurationInput
  ): Effect.Effect<[Effect.Effect<A, E>, Effect.Effect<void>], never, R> => {
    const duration = Duration.decode(timeToLive)
    return core.flatMap(
      core.context<R>(),
      (env) =>
        core.map(
          makeSynchronized<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>(Option.none()),
          (cache) =>
            [
              core.provideContext(getCachedValue(self, duration, cache), env),
              invalidateCache(cache)
            ] as [Effect.Effect<A, E>, Effect.Effect<void>]
        )
    )
  }
)

/** @internal */
const computeCachedValue = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeToLive: Duration.DurationInput,
  start: number
): Effect.Effect<Option.Option<[number, Deferred.Deferred<E, A>]>, never, R> => {
  const timeToLiveMillis = Duration.toMillis(Duration.decode(timeToLive))
  return pipe(
    core.deferredMake<E, A>(),
    core.tap((deferred) => core.intoDeferred(self, deferred)),
    core.map((deferred) => Option.some([start + timeToLiveMillis, deferred]))
  )
}

/** @internal */
const getCachedValue = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeToLive: Duration.DurationInput,
  cache: Synchronized.SynchronizedRef<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<A, E, R> =>
  core.uninterruptibleMask((restore) =>
    pipe(
      effect.clockWith((clock) => clock.currentTimeMillis),
      core.flatMap((time) =>
        updateSomeAndGetEffectSynchronized(cache, (option) => {
          switch (option._tag) {
            case "None": {
              return Option.some(computeCachedValue(self, timeToLive, time))
            }
            case "Some": {
              const [end] = option.value
              return end - time <= 0
                ? Option.some(computeCachedValue(self, timeToLive, time))
                : Option.none()
            }
          }
        })
      ),
      core.flatMap((option) =>
        Option.isNone(option) ?
          core.dieMessage(
            "BUG: Effect.cachedInvalidate - please report an issue at https://github.com/Effect-TS/effect/issues"
          ) :
          restore(core.deferredAwait(option.value[1]))
      )
    )
  )

/** @internal */
const invalidateCache = <E, A>(
  cache: Synchronized.SynchronizedRef<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<void> => internalRef.set(cache, Option.none())

/** @internal */
export const ensuringChild = dual<
  <X, R2>(
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<X, never, R2>
  ) => <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R | R2>,
  <A, E, R, X, R2>(
    self: Effect.Effect<A, E, R>,
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<X, never, R2>
  ) => Effect.Effect<A, E, R | R2>
>(2, (self, f) => ensuringChildren(self, (children) => f(fiberRuntime.fiberAll(children))))

/** @internal */
export const ensuringChildren = dual<
  <X, R2>(
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<X, never, R2>
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | R2>,
  <A, E, R, X, R2>(
    self: Effect.Effect<A, E, R>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<X, never, R2>
  ) => Effect.Effect<A, E, R | R2>
>(2, (self, children) =>
  core.flatMap(supervisor.track, (supervisor) =>
    pipe(
      supervised(self, supervisor),
      fiberRuntime.ensuring(core.flatMap(supervisor.value, children))
    )))

/** @internal */
export const forkAll: {
  (
    options?: {
      readonly discard?: false | undefined
    }
  ): <A, E, R>(effects: Iterable<Effect.Effect<A, E, R>>) => Effect.Effect<Fiber.Fiber<E, Array<A>>, never, R>
  (options: {
    readonly discard: true
  }): <A, E, R>(effects: Iterable<Effect.Effect<A, E, R>>) => Effect.Effect<void, never, R>
  <A, E, R>(
    effects: Iterable<Effect.Effect<A, E, R>>,
    options?: {
      readonly discard?: false | undefined
    }
  ): Effect.Effect<Fiber.Fiber<E, Array<A>>, never, R>
  <A, E, R>(effects: Iterable<Effect.Effect<A, E, R>>, options: {
    readonly discard: true
  }): Effect.Effect<void, never, R>
} = dual((args) => Predicate.isIterable(args[0]), <A, E, R>(effects: Iterable<Effect.Effect<A, E, R>>, options: {
  readonly discard: true
}): Effect.Effect<void, never, R> =>
  options?.discard ?
    core.forEachSequentialDiscard(effects, fiberRuntime.fork) :
    core.map(core.forEachSequential(effects, fiberRuntime.fork), fiberRuntime.fiberAll))

/** @internal */
export const forkIn = dual<
  (scope: Scope.Scope) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<Fiber.RuntimeFiber<E, A>, never, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, scope: Scope.Scope) => Effect.Effect<Fiber.RuntimeFiber<E, A>, never, R>
>(
  2,
  (self, scope) =>
    core.uninterruptibleMask((restore) =>
      core.flatMap(scope.fork(executionStrategy.sequential), (child) =>
        pipe(
          restore(self),
          core.onExit((exit) => child.close(exit)),
          fiberRuntime.forkDaemon,
          core.tap((fiber) =>
            child.addFinalizer(() =>
              core.fiberIdWith((fiberId) =>
                Equal.equals(fiberId, fiber.id()) ?
                  core.unit :
                  core.asUnit(core.interruptFiber(fiber))
              )
            )
          )
        ))
    )
)

/** @internal */
export const forkScoped = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Effect.Effect<Fiber.RuntimeFiber<E, A>, never, R | Scope.Scope> =>
  fiberRuntime.scopeWith((scope) => forkIn(self, scope))

/** @internal */
export const fromFiber = <E, A>(fiber: Fiber.Fiber<E, A>): Effect.Effect<A, E> => internalFiber.join(fiber)

/** @internal */
export const fromFiberEffect = <A, E, R>(fiber: Effect.Effect<Fiber.Fiber<E, A>, E, R>): Effect.Effect<A, E, R> =>
  core.suspend(() => core.flatMap(fiber, internalFiber.join))

const memoKeySymbol = Symbol.for("effect/Effect/memoizeFunction.key")

class Key<in out A> implements Equal.Equal {
  [memoKeySymbol] = memoKeySymbol
  constructor(readonly a: A, readonly eq?: Equivalence<A>) {}
  [Equal.symbol](that: Equal.Equal) {
    if (Predicate.hasProperty(that, memoKeySymbol)) {
      if (this.eq) {
        return this.eq(this.a, (that as unknown as Key<A>).a)
      } else {
        return Equal.equals(this.a, (that as unknown as Key<A>).a)
      }
    }
    return false
  }
  [Hash.symbol]() {
    return this.eq ? 0 : Hash.hash(this.a)
  }
}

/** @internal */
export const cachedFunction = <A, B, E, R>(
  f: (a: A) => Effect.Effect<B, E, R>,
  eq?: Equivalence<A>
): Effect.Effect<(a: A) => Effect.Effect<B, E, R>> => {
  return pipe(
    core.sync(() => MutableHashMap.empty<Key<A>, Deferred.Deferred<E, readonly [FiberRefsPatch.FiberRefsPatch, B]>>()),
    core.flatMap(makeSynchronized),
    core.map((ref) => (a: A) =>
      pipe(
        ref.modifyEffect((map) => {
          const result = pipe(map, MutableHashMap.get(new Key(a, eq)))
          if (Option.isNone(result)) {
            return pipe(
              core.deferredMake<E, readonly [FiberRefsPatch.FiberRefsPatch, B]>(),
              core.tap((deferred) =>
                pipe(
                  effect.diffFiberRefs(f(a)),
                  core.intoDeferred(deferred),
                  fiberRuntime.fork
                )
              ),
              core.map((deferred) => [deferred, pipe(map, MutableHashMap.set(new Key(a, eq), deferred))] as const)
            )
          }
          return core.succeed([result.value, map] as const)
        }),
        core.flatMap(core.deferredAwait),
        core.flatMap(([patch, b]) => pipe(effect.patchFiberRefs(patch), core.as(b)))
      )
    )
  )
}

/** @internal */
export const raceFirst = dual<
  <A2, E2, R2>(
    that: Effect.Effect<A2, E2, R2>
  ) => <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A2 | A, E2 | E, R | R2>,
  <A, E, R, A2, E2, R2>(
    self: Effect.Effect<A, E, R>,
    that: Effect.Effect<A2, E2, R2>
  ) => Effect.Effect<A2 | A, E2 | E, R | R2>
>(2, <A, E, R, A2, E2, R2>(
  self: Effect.Effect<A, E, R>,
  that: Effect.Effect<A2, E2, R2>
) =>
  pipe(
    core.exit(self),
    fiberRuntime.race(core.exit(that)),
    (effect: Effect.Effect<Exit.Exit<A | A2, E | E2>, never, R | R2>) => core.flatten(effect)
  ))

/** @internal */
export const scheduleForked = dual<
  <R2, Out>(
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => <A, E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<Fiber.RuntimeFiber<E, Out>, never, R | R2 | Scope.Scope>,
  <A, E, R, R2, Out>(
    self: Effect.Effect<A, E, R>,
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => Effect.Effect<Fiber.RuntimeFiber<E, Out>, never, R | R2 | Scope.Scope>
>(2, (self, schedule) => pipe(self, _schedule.schedule_Effect(schedule), forkScoped))

/** @internal */
export const supervised = dual<
  <X>(supervisor: Supervisor.Supervisor<X>) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R, X>(self: Effect.Effect<A, E, R>, supervisor: Supervisor.Supervisor<X>) => Effect.Effect<A, E, R>
>(2, (self, supervisor) => {
  const supervise = core.fiberRefLocallyWith(fiberRuntime.currentSupervisor, (s) => s.zip(supervisor))
  return supervise(self)
})

/** @internal */
export const timeout = dual<
  (
    duration: Duration.DurationInput
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | Cause.TimeoutException, R>,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    duration: Duration.DurationInput
  ) => Effect.Effect<A, E | Cause.TimeoutException, R>
>(2, (self, duration) =>
  timeoutFail(self, {
    onTimeout: () => new core.TimeoutException(),
    duration
  }))

/** @internal */
export const timeoutFail = dual<
  <E1>(
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.DurationInput
    }
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E1, R>,
  <A, E, R, E1>(
    self: Effect.Effect<A, E, R>,
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<A, E | E1, R>
>(2, (self, { duration, onTimeout }) =>
  core.flatten(timeoutTo(self, {
    onTimeout: () => core.failSync(onTimeout),
    onSuccess: core.succeed,
    duration
  })))

/** @internal */
export const timeoutFailCause = dual<
  <E1>(
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.DurationInput
    }
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E | E1, R>,
  <A, E, R, E1>(
    self: Effect.Effect<A, E, R>,
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<A, E | E1, R>
>(2, (self, { duration, onTimeout }) =>
  core.flatten(timeoutTo(self, {
    onTimeout: () => core.failCauseSync(onTimeout),
    onSuccess: core.succeed,
    duration
  })))

/** @internal */
export const timeoutTo = dual<
  <A, B, B1>(
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ) => <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<B | B1, E, R>,
  <A, E, R, B1, B>(
    self: Effect.Effect<A, E, R>,
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<B | B1, E, R>
>(2, (self, { duration, onSuccess, onTimeout }) =>
  core.fiberIdWith((parentFiberId) =>
    fiberRuntime.raceFibersWith(
      self,
      core.interruptible(effect.sleep(duration)),
      {
        onSelfWin: (winner, loser) =>
          core.flatMap(
            winner.await,
            (exit) => {
              if (exit._tag === "Success") {
                return core.flatMap(
                  winner.inheritAll,
                  () =>
                    core.as(
                      core.interruptAsFiber(loser, parentFiberId),
                      onSuccess(exit.value)
                    )
                )
              } else {
                return core.flatMap(
                  core.interruptAsFiber(loser, parentFiberId),
                  () => core.exitFailCause(exit.cause)
                )
              }
            }
          ),
        onOtherWin: (winner, loser) =>
          core.flatMap(
            winner.await,
            (exit) => {
              if (exit._tag === "Success") {
                return core.flatMap(
                  winner.inheritAll,
                  () =>
                    core.as(
                      core.interruptAsFiber(loser, parentFiberId),
                      onTimeout()
                    )
                )
              } else {
                return core.flatMap(
                  core.interruptAsFiber(loser, parentFiberId),
                  () => core.exitFailCause(exit.cause)
                )
              }
            }
          ),
        otherScope: globalScope
      }
    )
  ))

// circular with Synchronized

/** @internal */
const SynchronizedSymbolKey = "effect/Ref/SynchronizedRef"

/** @internal */
export const SynchronizedTypeId: Synchronized.SynchronizedRefTypeId = Symbol.for(
  SynchronizedSymbolKey
) as Synchronized.SynchronizedRefTypeId

/** @internal */
export const synchronizedVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
class SynchronizedImpl<in out A> implements Synchronized.SynchronizedRef<A> {
  readonly [SynchronizedTypeId] = synchronizedVariance
  readonly [internalRef.RefTypeId] = internalRef.refVariance
  constructor(
    readonly ref: Ref.Ref<A>,
    readonly withLock: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  ) {}
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<B> {
    return this.modifyEffect((a) => core.succeed(f(a)))
  }
  modifyEffect<B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R> {
    return this.withLock(
      pipe(
        core.flatMap(internalRef.get(this.ref), f),
        core.flatMap(([b, a]) => core.as(internalRef.set(this.ref, a), b))
      )
    )
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const makeSynchronized = <A>(value: A): Effect.Effect<Synchronized.SynchronizedRef<A>> =>
  core.sync(() => unsafeMakeSynchronized(value))

/** @internal */
export const unsafeMakeSynchronized = <A>(value: A): Synchronized.SynchronizedRef<A> => {
  const ref = internalRef.unsafeMake(value)
  const sem = unsafeMakeSemaphore(1)
  return new SynchronizedImpl(ref, sem.withPermits(1))
}

/** @internal */
export const updateSomeAndGetEffectSynchronized = dual<
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<A, E, R>,
  <A, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<A, E, R>>
  ) => Effect.Effect<A, E, R>
>(2, (self, pf) =>
  self.modifyEffect((value) => {
    const result = pf(value)
    switch (result._tag) {
      case "None": {
        return core.succeed([value, value] as const)
      }
      case "Some": {
        return core.map(result.value, (a) => [a, a] as const)
      }
    }
  }))

// circular with Fiber

/** @internal */
export const zipFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, [A, A2]>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, [A, A2]>
>(2, (self, that) => zipWithFiber(self, that, (a, b) => [a, b]))

/** @internal */
export const zipLeftFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, A>
>(2, (self, that) => zipWithFiber(self, that, (a, _) => a))

/** @internal */
export const zipRightFiber = dual<
  <E2, A2>(that: Fiber.Fiber<E2, A2>) => <E, A>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, A2>,
  <E, A, E2, A2>(self: Fiber.Fiber<E, A>, that: Fiber.Fiber<E2, A2>) => Fiber.Fiber<E | E2, A2>
>(2, (self, that) => zipWithFiber(self, that, (_, b) => b))

/** @internal */
export const zipWithFiber = dual<
  <E2, A, B, C>(
    that: Fiber.Fiber<E2, B>,
    f: (a: A, b: B) => C
  ) => <E>(self: Fiber.Fiber<E, A>) => Fiber.Fiber<E | E2, C>,
  <E, A, E2, B, C>(
    self: Fiber.Fiber<E, A>,
    that: Fiber.Fiber<E2, B>,
    f: (a: A, b: B) => C
  ) => Fiber.Fiber<E | E2, C>
>(3, (self, that, f) => ({
  [internalFiber.FiberTypeId]: internalFiber.fiberVariance,
  id: () => pipe(self.id(), FiberId.getOrElse(that.id())),
  await: pipe(
    self.await,
    core.flatten,
    fiberRuntime.zipWithOptions(core.flatten(that.await), f, { concurrent: true }),
    core.exit
  ),
  children: self.children,
  inheritAll: core.zipRight(
    that.inheritAll,
    self.inheritAll
  ),
  poll: core.zipWith(
    self.poll,
    that.poll,
    (optionA, optionB) =>
      pipe(
        optionA,
        Option.flatMap((exitA) =>
          pipe(
            optionB,
            Option.map((exitB) =>
              Exit.zipWith(exitA, exitB, {
                onSuccess: f,
                onFailure: internalCause.parallel
              })
            )
          )
        )
      )
  ),
  interruptAsFork: (id) =>
    core.zipRight(
      self.interruptAsFork(id),
      that.interruptAsFork(id)
    ),
  pipe() {
    return pipeArguments(this, arguments)
  }
}))
