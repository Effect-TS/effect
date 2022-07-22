import {
  Effect,
  IFiberRefDelete,
  IFiberRefLocally,
  IFiberRefModify,
  IFiberRefWith
} from "@effect/core/io/Effect/definition"
import { _Patch, _Value, FiberRef, FiberRefSym } from "@effect/core/io/FiberRef/definition"
import type { Scheduler } from "@effect/core/support/Scheduler"
import { defaultScheduler } from "@effect/core/support/Scheduler"

export class FiberRefInternal<Value, Patch> implements FiberRef.WithPatch<Value, Patch> {
  readonly [FiberRefSym]: FiberRefSym = FiberRefSym
  readonly [_Value]!: Value
  readonly [_Patch]!: Patch

  constructor(
    readonly initial: Value,
    readonly diff: (oldValue: Value, newValue: Value) => Patch,
    readonly combine: (first: Patch, second: Patch) => Patch,
    readonly patch: (patch: Patch) => (oldValue: Value) => Value,
    readonly fork: Patch
  ) {}

  /**
   * Atomically modifies the `FiberRef` with the specified function, which
   * computes a return value for the modification. This is a more powerful
   * version of `update`.
   */
  modify<B>(
    f: (a: Value) => Tuple<[B, Value]>,
    __tsplusTrace?: string
  ): Effect<never, never, B> {
    return new IFiberRefModify(this, f, __tsplusTrace)
  }

  delete(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string | undefined): Effect<never, never, void> {
    return new IFiberRefDelete(this, __tsplusTrace)
  }

  get(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string): Effect<never, never, Value> {
    return this.modify((a) => Tuple(a, a))
  }

  getAndSet(this: FiberRef.WithPatch<Value, Patch>, value: Value, __tsplusTrace?: string): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, value))
  }

  getAndUpdate(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value,
    __tsplusTrace?: string
  ): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, f(v)))
  }

  getAndUpdateSome(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>,
    __tsplusTrace?: string
  ): Effect<never, never, Value> {
    return this.modify((v) => Tuple(v, pf(v).getOrElse(v)))
  }

  getWith<R, E, B>(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Effect<R, E, B>,
    __tsplusTrace?: string
  ): Effect<R, E, B> {
    return new IFiberRefWith(this, f, __tsplusTrace)
  }

  locally(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value,
    __tsplusTrace?: string
  ): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B> {
    return (use) => new IFiberRefLocally(value, this, use, __tsplusTrace)
  }

  locallyScoped(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value,
    __tsplusTrace?: string
  ): Effect<Scope, never, void> {
    return Effect.acquireRelease(
      this.get().flatMap((old) => this.set(value).as(old)),
      (a) => this.set(a)
    ).unit
  }

  locallyScopedWith(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value,
    __tsplusTrace?: string
  ): Effect<Scope, never, void> {
    return this.getWith((a) => this.locallyScoped(f(a)))
  }

  locallyWith(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value,
    __tsplusTrace?: string
  ): <R, E, B>(effect: Effect<R, E, B>) => Effect<R, E, B> {
    return (effect) => this.getWith((a) => effect.apply(this.locally(f(a))))
  }

  update(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value,
    __tsplusTrace?: string
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined, f(v)))
  }

  set(
    this: FiberRef.WithPatch<Value, Patch>,
    value: Value,
    __tsplusTrace?: string
  ): Effect<never, never, void> {
    return this.modify(() => Tuple(undefined, value))
  }

  modifySome<B>(
    this: FiberRef.WithPatch<Value, Patch>,
    def: B,
    f: (a: Value) => Maybe<Tuple<[B, Value]>>,
    __tsplusTrace?: string
  ): Effect<never, never, B> {
    return this.modify((v) => f(v).getOrElse(Tuple(def, v)))
  }

  reset(this: FiberRef.WithPatch<Value, Patch>, __tsplusTrace?: string): Effect<never, never, void> {
    return this.set(this.initial)
  }

  updateAndGet(
    this: FiberRef.WithPatch<Value, Patch>,
    f: (a: Value) => Value,
    __tsplusTrace?: string
  ): Effect<never, never, Value> {
    return this.modify((v) => {
      const result = f(v)
      return Tuple(result, result)
    })
  }

  updateSome(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>,
    __tsplusTrace?: string
  ): Effect<never, never, void> {
    return this.modify((v) => Tuple(undefined, pf(v).getOrElse(v)))
  }

  /**
   * Atomically modifies the `FiberRef` with the specified partial function.
   * If the function is undefined on the current value it returns the old
   * value without changing it.
   */
  updateSomeAndGet(
    this: FiberRef.WithPatch<Value, Patch>,
    pf: (a: Value) => Maybe<Value>,
    __tsplusTrace?: string
  ): Effect<never, never, Value> {
    return this.modify((v) => {
      const result = pf(v).getOrElse(v)
      return Tuple(result, result)
    })
  }
}

/**
 * @tsplus macro remove
 */
export function concreteFiberRef<Value, Patch>(
  _: FiberRef.WithPatch<Value, Patch>
): asserts _ is FiberRefInternal<Value, Patch> {
  //
}

/**
 * Creates a new `FiberRef` with given initial value.
 *
 * @tsplus static effect/core/io/FiberRef.Ops make
 */
export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a,
  __tsplusTrace?: string
): Effect<Scope, never, FiberRef<A>> {
  return FiberRef.makeWith(
    FiberRef.unsafeMake(initial, fork, join)
  )
}

/**
 * Creates a new `FiberRef` with specified initial value of the environment,
 * using `Service.Env.Patch` to combine updates to the environment in a
 * compositional manner.
 *
 * @tsplus static effect/core/io/FiberRef.Ops makeEnvironment
 */
export function makeEnvironment<A>(
  initial: LazyArg<Service.Env<A>>,
  __tsplusTrace?: string
): Effect<Scope, never, FiberRef.WithPatch<Service.Env<A>, Service.Patch<A, A>>> {
  return FiberRef.makeWith(FiberRef.unsafeMakeEnvironment(initial()))
}

/**
 * Creates a new `FiberRef` with the specified initial value, using the
 * specified patch type to combine updates to the value in a compositional
 * way.
 *
 * @tsplus static effect/core/io/FiberRef.Ops makePatch
 */
export function makePatch<Value, Patch>(
  initial: Value,
  diff: (oldValue: Value, newValue: Value) => Patch,
  combine: (first: Patch, second: Patch) => Patch,
  patch: (patch: Patch) => (oldValue: Value) => Value,
  fork: Patch,
  __tsplusTrace?: string
): Effect<Scope, never, FiberRef.WithPatch<Value, Patch>> {
  return FiberRef.makeWith(
    FiberRef.unsafeMakePatch(initial, diff, combine, patch, fork)
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops makeWith
 */
export function makeWith<Value, Patch>(
  ref: LazyArg<FiberRef.WithPatch<Value, Patch>>,
  __tsplusTrace?: string
): Effect<Scope, never, FiberRef.WithPatch<Value, Patch>> {
  return Effect.acquireRelease(
    Effect.succeed(ref).tap((ref) => ref.update(identity)),
    (ref) => ref.delete()
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMake
 */
export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): FiberRef<A> {
  return FiberRef.unsafeMakePatch<A, (a: A) => A>(
    initial,
    (_, newValue) => () => newValue,
    (first, second) => (value) => second(first(value)),
    (patch) => (value) => join(value, patch(value)),
    fork
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakeEnvironment
 */
export function unsafeMakeEnvironment<A>(
  initial: Service.Env<A>
): FiberRef.WithPatch<Service.Env<A>, Service.Patch<A, A>> {
  return new FiberRefInternal(
    initial,
    Service.Patch.diff,
    (first, second) => first.combine(second),
    (patch) => (value) => patch.patch(value),
    Service.Patch.empty()
  )
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMakePatch
 */
export function unsafeMakePatch<Value, Patch>(
  initial: Value,
  diff: (oldValue: Value, newValue: Value) => Patch,
  combine: (first: Patch, second: Patch) => Patch,
  patch: (patch: Patch) => (oldValue: Value) => Value,
  fork: Patch
): FiberRef.WithPatch<Value, Patch> {
  return new FiberRefInternal(
    initial,
    diff,
    combine,
    patch,
    fork
  )
}

//
// Circular with Effect
//

/**
 * A more powerful variant of `addFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static effect/core/io/Effect.Ops addFinalizerExit
 */
export function addFinalizerExit<R, X>(
  finalizer: (exit: Exit<unknown, unknown>) => Effect<R, never, X>,
  __tsplusTrace?: string
): Effect<R | Scope, never, void> {
  return Do(($) => {
    const environment = $(Effect.environment<R>())
    const scope = $(Effect.scope)
    return $(scope.addFinalizerExit((exit) => finalizer(exit).provideEnvironment(environment)))
  })
}

/**
 * A more powerful variant of `acquireRelease` that allows the `release`
 * workflow to depend on the `Exit` value specified when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireReleaseExit
 * @tsplus fluent effect/core/io/Effect acquireReleaseExit
 */
export function acquireReleaseExit<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<R2, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.suspendSucceed(acquire)
    .tap((a) => Effect.addFinalizerExit((exit) => release(a, exit)))
    .uninterruptible
}

/**
 * Constructs a scoped resource from an `acquire` and `release` workflow. If
 * `acquire` successfully completes execution then `release` will be added to
 * the finalizers associated with the scope of this workflow and is guaranteed
 * to be run when the scope is closed.
 *
 * The `acquire` and `release` workflows will be run uninterruptibly.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireRelease
 * @tsplus fluent effect/core/io/Effect acquireRelease
 */
export function acquireRelease<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A) => Effect<R2, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.acquireReleaseExit(acquire, (a, _) => release(a), __tsplusTrace)
}

/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environment
 */
export function environment<R>(__tsplusTrace?: string): Effect<R, never, Env<R>> {
  return Effect.suspendSucceed(FiberRef.currentEnvironment.get() as Effect<never, never, Env<R>>)
}

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentEnvironment
 */
export const currentEnvironment: FiberRef<Env<never>> = FiberRef.unsafeMake(Env.empty)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentScheduler
 */
export const currentScheduler: FiberRef<Scheduler> = FiberRef.unsafeMake(defaultScheduler)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogAnnotations
 */
export const currentLogAnnotations: FiberRef<ImmutableMap<string, string>> = FiberRef.unsafeMake(ImmutableMap.empty())

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogLevel
 */
export const currentLogLevel: FiberRef<LogLevel> = FiberRef.unsafeMake(LogLevel.Info)

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentLogSpan
 */
export const currentLogSpan: FiberRef<List<LogSpan>> = FiberRef.unsafeMake(List.empty<LogSpan>())

/**
 * @tsplus static effect/core/io/FiberRef.Ops currentParallelism
 */
export const currentParallelism: FiberRef<Maybe<number>> = FiberRef.unsafeMake(Maybe.emptyOf<number>())

/**
 * @tsplus static effect/core/io/FiberRef.Ops forkScopeOverride
 */
export const forkScopeOverride: FiberRef<Maybe<FiberScope>> = FiberRef.unsafeMake(
  Maybe.none,
  () => Maybe.emptyOf<FiberScope>()
)

/**
 * Provides the effect with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/io/Effect.Aspects provideEnvironment
 * @tsplus pipeable effect/core/io/Effect provideEnvironment
 */
export function provideEnvironment<R>(environment: LazyArg<Env<R>>, __tsplusTrace?: string) {
  return <E, A>(self: Effect<R, E, A>): Effect<never, E, A> =>
    Effect.succeed(environment).flatMap((env) =>
      (self as Effect<never, E, A>).apply(
        FiberRef.currentEnvironment.locally(env as Env<never>)
      )
    )
}

/**
 * Returns the current scope.
 *
 * @tsplus static effect/core/io/Effect.Ops scope
 */
export const scope: Effect<Scope, never, Scope> = Effect.service(Scope.Tag)

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/io/Effect.Ops service
 */
export function service<T>(
  tag: Tag<T>,
  __tsplusTrace?: string
): Effect<T, never, T> {
  return Effect.serviceWithEffect(tag, Effect.succeedNow)
}

/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/io/Effect.Ops serviceWithEffect
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (a: T) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R | T, E, A> {
  return Effect.suspendSucceed(
    FiberRef.currentEnvironment.get().flatMap((env) => f(env.unsafeGet(tag)))
  )
}
