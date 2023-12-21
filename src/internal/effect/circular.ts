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

  readonly take = (n: number): Effect.Effect<never, never, number> =>
    core.asyncEither<never, never, number>((resume) => {
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

  readonly release = (n: number): Effect.Effect<never, never, void> =>
    core.withFiberRuntime<never, never, void>((fiber) => {
      this.taken -= n
      fiber.getFiberRef(currentScheduler).scheduleTask(() => {
        this.waiters.forEach((wake) => wake())
      }, fiber.getFiberRef(core.currentSchedulingPriority))
      return core.unit
    })

  readonly withPermits = (n: number) => <R, E, A>(self: Effect.Effect<R, E, A>) =>
    core.uninterruptibleMask((restore) =>
      core.flatMap(
        restore(this.take(n)),
        (permits) => fiberRuntime.ensuring(restore(self), this.release(permits))
      )
    )
}

/** @internal */
export const unsafeMakeSemaphore = (leases: number) => {
  return new Semaphore(leases)
}

/** @internal */
export const makeSemaphore = (permits: number) => core.sync(() => unsafeMakeSemaphore(permits))

/** @internal */
export const awaitAllChildren = <R, E, A>(self: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
  ensuringChildren(self, fiberRuntime.fiberAwaitAll)

/** @internal */
export const cached = dual<
  (
    timeToLive: Duration.DurationInput
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Effect.Effect<never, E, A>>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    timeToLive: Duration.DurationInput
  ) => Effect.Effect<R, never, Effect.Effect<never, E, A>>
>(2, (self, timeToLive) => core.map(cachedInvalidate(self, timeToLive), (tuple) => tuple[0]))

/** @internal */
export const cachedInvalidate = dual<
  (
    timeToLive: Duration.DurationInput
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R, never, [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    timeToLive: Duration.DurationInput
  ) => Effect.Effect<R, never, [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]>
>(
  2,
  <R, E, A>(self: Effect.Effect<R, E, A>, timeToLive: Duration.DurationInput) => {
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
            ] as [Effect.Effect<never, E, A>, Effect.Effect<never, never, void>]
        )
    )
  }
)

/** @internal */
const computeCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.DurationInput,
  start: number
): Effect.Effect<R, never, Option.Option<[number, Deferred.Deferred<E, A>]>> => {
  const timeToLiveMillis = Duration.toMillis(Duration.decode(timeToLive))
  return pipe(
    core.deferredMake<E, A>(),
    core.tap((deferred) => core.intoDeferred(self, deferred)),
    core.map((deferred) => Option.some([start + timeToLiveMillis, deferred]))
  )
}

/** @internal */
const getCachedValue = <R, E, A>(
  self: Effect.Effect<R, E, A>,
  timeToLive: Duration.DurationInput,
  cache: Synchronized.SynchronizedRef<Option.Option<readonly [number, Deferred.Deferred<E, A>]>>
): Effect.Effect<R, E, A> =>
  core.uninterruptibleMask<R, E, A>((restore) =>
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
): Effect.Effect<never, never, void> => internalRef.set(cache, Option.none())

/** @internal */
export const ensuringChild = dual<
  <R2, X>(
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<R2, never, X>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E, A>,
  <R, E, A, R2, X>(
    self: Effect.Effect<R, E, A>,
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect.Effect<R2, never, X>
  ) => Effect.Effect<R | R2, E, A>
>(2, (self, f) => ensuringChildren(self, (children) => f(fiberRuntime.fiberAll(children))))

/** @internal */
export const ensuringChildren = dual<
  <R1, X>(
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R | R1, E, A>,
  <R, E, A, R1, X>(
    self: Effect.Effect<R, E, A>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect.Effect<R1, never, X>
  ) => Effect.Effect<R | R1, E, A>
>(2, (self, children) =>
  core.flatMap(supervisor.track, (supervisor) =>
    pipe(
      supervised(self, supervisor),
      fiberRuntime.ensuring(core.flatMap(supervisor.value, children))
    )))

/** @internal */
// @ts-expect-error
export const forkAll = dual<
  {
    (options?: {
      readonly discard?: false | undefined
    }): <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>
    ) => Effect.Effect<R, never, Fiber.Fiber<E, Array<A>>>
    (options: {
      readonly discard: true
    }): <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>
    ) => Effect.Effect<R, never, void>
  },
  {
    <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>,
      options?: {
        readonly discard?: false | undefined
      }
    ): Effect.Effect<R, never, Fiber.Fiber<E, Array<A>>>
    <R, E, A>(
      effects: Iterable<Effect.Effect<R, E, A>>,
      options: {
        readonly discard: true
      }
    ): Effect.Effect<R, never, void>
  }
>((args) => Predicate.isIterable(args[0]), (
  effects,
  options
) =>
  options?.discard ?
    core.forEachSequentialDiscard(effects, fiberRuntime.fork) :
    core.map(core.forEachSequential(effects, fiberRuntime.fork), fiberRuntime.fiberAll))

/** @internal */
export const forkIn = dual<
  (scope: Scope.Scope) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>,
  <R, E, A>(self: Effect.Effect<R, E, A>, scope: Scope.Scope) => Effect.Effect<R, never, Fiber.RuntimeFiber<E, A>>
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
export const forkScoped = <R, E, A>(
  self: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Fiber.RuntimeFiber<E, A>> =>
  fiberRuntime.scopeWith((scope) => forkIn(self, scope))

/** @internal */
export const fromFiber = <E, A>(fiber: Fiber.Fiber<E, A>): Effect.Effect<never, E, A> => internalFiber.join(fiber)

/** @internal */
export const fromFiberEffect = <R, E, A>(fiber: Effect.Effect<R, E, Fiber.Fiber<E, A>>): Effect.Effect<R, E, A> =>
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
export const memoizeFunction = <R, E, A, B>(
  f: (a: A) => Effect.Effect<R, E, B>,
  eq?: Equivalence<A>
): Effect.Effect<never, never, (a: A) => Effect.Effect<R, E, B>> => {
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
  <R2, E2, A2>(
    that: Effect.Effect<R2, E2, A2>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    that: Effect.Effect<R2, E2, A2>
  ) => Effect.Effect<R | R2, E2 | E, A2 | A>
>(2, <R, E, A, R2, E2, A2>(
  self: Effect.Effect<R, E, A>,
  that: Effect.Effect<R2, E2, A2>
) =>
  pipe(
    core.exit(self),
    fiberRuntime.race(core.exit(that)),
    (effect: Effect.Effect<R | R2, never, Exit.Exit<E | E2, A | A2>>) => core.flatten(effect)
  ))

/** @internal */
export const scheduleForked = dual<
  <R2, Out>(
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => <R, E, A>(
    self: Effect.Effect<R, E, A>
  ) => Effect.Effect<R | R2 | Scope.Scope, never, Fiber.RuntimeFiber<E, Out>>,
  <R, E, A, R2, Out>(
    self: Effect.Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, Out>
  ) => Effect.Effect<R | R2 | Scope.Scope, never, Fiber.RuntimeFiber<E, Out>>
>(2, (self, schedule) => pipe(self, _schedule.schedule_Effect(schedule), forkScoped))

/** @internal */
export const supervised = dual<
  <X>(supervisor: Supervisor.Supervisor<X>) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A, X>(self: Effect.Effect<R, E, A>, supervisor: Supervisor.Supervisor<X>) => Effect.Effect<R, E, A>
>(2, (self, supervisor) => {
  const supervise = core.fiberRefLocallyWith(fiberRuntime.currentSupervisor, (s) => s.zip(supervisor))
  return supervise(self)
})

/** @internal */
export const timeout = dual<
  (
    duration: Duration.DurationInput
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | Cause.NoSuchElementException, A>,
  <R, E, A>(
    self: Effect.Effect<R, E, A>,
    duration: Duration.DurationInput
  ) => Effect.Effect<R, E | Cause.NoSuchElementException, A>
>(2, (self, duration) =>
  timeoutFail(self, {
    onTimeout: () => new core.NoSuchElementException(),
    duration
  }))

/** @internal */
export const timeoutFail = dual<
  <E1>(
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.DurationInput
    }
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, A>,
  <R, E, A, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<E1>
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<R, E | E1, A>
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
  ) => <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E | E1, A>,
  <R, E, A, E1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<Cause.Cause<E1>>
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<R, E | E1, A>
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
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, B | B1>,
  <R, E, A, B, B1>(
    self: Effect.Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ) => Effect.Effect<R, E, B | B1>
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
    readonly withLock: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  ) {}
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B> {
    return this.modifyEffect((a) => core.succeed(f(a)))
  }
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B> {
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
export const makeSynchronized = <A>(value: A): Effect.Effect<never, never, Synchronized.SynchronizedRef<A>> =>
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
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => (self: Synchronized.SynchronizedRef<A>) => Effect.Effect<R, E, A>,
  <A, R, E>(
    self: Synchronized.SynchronizedRef<A>,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ) => Effect.Effect<R, E, A>
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
