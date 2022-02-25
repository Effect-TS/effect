import { List } from "../../../collection/immutable/List"
import * as Map from "../../../collection/immutable/Map"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import { LazyValue } from "../../../data/LazyValue"
import { Option } from "../../../data/Option"
import type { IO, RIO, UIO } from "../../Effect/definition/base"
import { Effect } from "../../Effect/definition/base"
import { IFiberRefLocally, IFiberRefModify } from "../../Effect/definition/primitives"
import type { LogLevel } from "../../LogLevel"
import { Info } from "../../LogLevel/definition"
import type { LogSpan } from "../../LogSpan"
import { Managed } from "../../Managed/definition"
import { ReleaseMap } from "../../Managed/ReleaseMap"
import type { Scope } from "../../Scope"
import { get as fiberRefGet } from "../operations/get"
import { locally_ } from "../operations/locally"
import { update_ } from "../operations/update"
import type { FiberRef, XFiberRef } from "./base"
import { XFiberRefInternal } from "./base"

export class Runtime<A> extends XFiberRefInternal<never, never, A, A> {
  readonly _tag = "Runtime"

  constructor(
    readonly initial: A,
    readonly fork: (a: A) => A,
    readonly join: (x: A, y: A) => A
  ) {
    super()
  }

  get initialValue(): Either<never, A> {
    return Either.right(this.initial)
  }

  get get(): IO<never, A> {
    return this.modify((v) => Tuple(v, v))
  }

  set(value: A, __tsplusTrace?: string): IO<never, void> {
    return this.modify(() => Tuple(undefined, value))
  }

  fold<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: A) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return new Derived((f) => f(this, bd, ca))
  }

  foldAll<EC, ED, C, D>(
    _ea: (_: never) => EC,
    _eb: (_: never) => ED,
    _ec: (_: never) => EC,
    ca: (c: C) => (b: A) => Either<EC, A>,
    bd: (b: A) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return new DerivedAll((f) => f(this, this.initialValue.flatMap(bd), bd, ca))
  }

  locally(
    value: A,
    __trace?: string
  ): <R, EC, C>(use: Effect<R, EC, C>) => Effect<R, EC, C> {
    return (use) => new IFiberRefLocally(value, this, use, __trace)
  }

  locallyManaged(value: A, __trace?: string): Managed<unknown, never, void> {
    return Managed(
      Effect.Do()
        .bind("r", () => Effect.environment<unknown>())
        .bind("releaseMap", () => fiberRefGet(currentReleaseMap.value))
        .bind("a", () => this.get.flatMap((old) => this.set(value).as(old)))
        .bind("releaseMapEntry", ({ a, r, releaseMap }) =>
          releaseMap.add(() => locally_(currentEnvironment.value, r)(this.set(a)))
        )
        .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
        .uninterruptible()
    ).asUnit()
  }

  modify<B>(f: (a: A) => Tuple<[B, A]>, __tsplusTrace?: string): UIO<B> {
    return new IFiberRefModify(this, f, __tsplusTrace)
  }
}

export class Derived<EA, EB, A, B> extends XFiberRefInternal<EA, EB, A, B> {
  readonly _tag = "Derived"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        getEither: (s: S) => Either<EB, B>,
        setEither: (a: A) => Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get initialValue(): Either<EB, B> {
    return this.use((value, getEither) => value.initialValue.flatMap(getEither))
  }

  get get(): IO<EB, B> {
    return this.use((value, getEither) =>
      value.get.flatMap((s) => getEither(s).fold(Effect.failNow, Effect.succeedNow))
    )
  }

  set(a: A, __tsplusTrace?: string): IO<EA, void> {
    return this.use((value, _, setEither) =>
      setEither(a).fold(
        (e) => Effect.failNow(e),
        (s) => value.set(s)
      )
    )
  }

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived((f) =>
          f(
            value,
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) =>
              ca(c).flatMap((a) =>
                setEither(a).fold((e) => Either.left(ea(e)), Either.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ec: (eb: EB) => EC,
    ca: (c: C) => (b: B) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            this.initialValue.mapLeft(eb).flatMap(bd),
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) => (s) =>
              getEither(s)
                .fold((e) => Either.left(ec(e)), ca(c))
                .flatMap((a) =>
                  setEither(a).fold((e) => Either.left(ea(e)), Either.right)
                )
          )
        )
    )
  }

  locally(a: A, __tsplusTrace?: string) {
    return <R, EC, C>(use: Effect<R, EC, C>): Effect<R, EA | EC, C> =>
      this.use((value, _, setEither) =>
        value.get.flatMap((old) =>
          setEither(a).fold(
            (e) => Effect.failNow<EA | EC>(e),
            (s) => value.set(s).acquireRelease(use, value.set(old))
          )
        )
      )
  }

  locallyManaged(a: A, __tsplusTrace?: string): Managed<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      Managed(
        Effect.Do()
          .bind("r", () => Effect.environment<unknown>())
          .bind("releaseMap", () => fiberRefGet(currentReleaseMap.value))
          .bind("a", () =>
            value.get.flatMap((old) =>
              setEither(a).fold(Effect.failNow, (s) => value.set(s).as(old))
            )
          )
          .bind("releaseMapEntry", ({ a, r, releaseMap }) =>
            releaseMap.add(() => locally_(currentEnvironment.value, r)(value.set(a)))
          )
          .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
          .uninterruptible()
      ).asUnit()
    )
  }
}

export class DerivedAll<EA, EB, A, B> extends XFiberRefInternal<EA, EB, A, B> {
  readonly _tag = "DerivedAll"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        initialValue: Either<EB, B>,
        getEither: (s: S) => Either<EB, B>,
        setEither: (a: A) => (s: S) => Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get initialValue(): Either<EB, B> {
    return this.use((_, initialValue) => initialValue)
  }

  get get(): IO<EB, B> {
    return this.use((value, _, getEither) =>
      value.get.flatMap((s) => getEither(s).fold(Effect.failNow, Effect.succeedNow))
    )
  }

  set(a: A, __tsplusTrace?: string): IO<EA, void> {
    return this.use((value, _, __, setEither) =>
      value.modify((s) =>
        setEither(a)(s).fold(
          (e) => Tuple(Either.leftW<EA, void>(e), s),
          (s) => Tuple(Either.rightW<void, EA>(undefined), s)
        )
      )
    )
  }

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, initialValue, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            initialValue.mapLeft(eb).flatMap(bd),
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) => (s) =>
              ca(c).flatMap((a) =>
                setEither(a)(s).fold((e) => Either.left(ea(e)), Either.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ec: (eb: EB) => EC,
    ca: (c: C) => (b: B) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, initialValue, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            initialValue.mapLeft(eb).flatMap(bd),
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) => (s) =>
              getEither(s)
                .fold((e) => Either.left(ec(e)), ca(c))
                .flatMap((a) =>
                  setEither(a)(s).fold((e) => Either.left(ea(e)), Either.right)
                )
          )
        )
    )
  }

  locally(a: A, __tsplusTrace?: string) {
    return <R, EC, C>(use: Effect<R, EC, C>): Effect<R, EA | EC, C> =>
      this.use((value, _, __, setEither) =>
        value.get.flatMap((old) =>
          setEither(a)(old).fold(
            (e) => Effect.failNow<EA | EC>(e),
            (s) => value.set(s).acquireRelease(use, value.set(old))
          )
        )
      )
  }

  locallyManaged(a: A, __tsplusTrace?: string): Managed<unknown, EA, void> {
    return this.use((value, _, __, setEither) =>
      Managed(
        Effect.Do()
          .bind("r", () => Effect.environment<unknown>())
          .bind("releaseMap", () => fiberRefGet(currentReleaseMap.value))
          .bind("a", () =>
            value.get.flatMap((old) =>
              setEither(a)(old).fold(Effect.failNow, (s) => value.set(s).as(old))
            )
          )
          .bind("releaseMapEntry", ({ a, r, releaseMap }) =>
            releaseMap.add(() => locally_(currentEnvironment.value, r)(value.set(a)))
          )
          .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
          .uninterruptible()
      ).asUnit()
    )
  }
}

/**
 * Creates a new `FiberRef` with given initial value.
 */
export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (x: A, y: A) => A = (_, a) => a,
  __tsplusTrace?: string
): UIO<FiberRef.Runtime<A>> {
  return Effect.suspendSucceed(() => {
    const ref = unsafeMake(initial, fork, join)
    return update_(ref, identity).map(() => ref)
  })
}

export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (x: A, y: A) => A = (_, a) => a
): FiberRef.Runtime<A> {
  return new Runtime(initial, fork, join)
}

/**
 * A `FiberRef` containing a reference to the current environment.
 */
export const currentEnvironment: LazyValue<FiberRef.Runtime<any>> = LazyValue.make(() =>
  unsafeMake({} as any, identity, (a, _) => a)
)

/**
 * A `FiberRef` containing a reference to the current `LogLevel`.
 */
export const currentLogLevel: LazyValue<FiberRef.Runtime<LogLevel>> = LazyValue.make(
  () => unsafeMake(Info)
)

/**
 * A `FiberRef` containing a reference to the current list of `LogSpan`s.
 */
export const currentLogSpan: LazyValue<FiberRef.Runtime<List<LogSpan>>> =
  LazyValue.make(() => unsafeMake(List.empty()))

/**
 * A `FiberRef` containing a reference to the current map of log annotations.
 */
export const currentLogAnnotations: LazyValue<
  FiberRef.Runtime<Map.Map<string, string>>
> = LazyValue.make(() => unsafeMake<Map.Map<string, string>>(Map.empty))

/**
 * A `FiberRef` containing a reference to the current operation parallelism.
 */
export const currentParallelism: LazyValue<FiberRef.Runtime<Option<number>>> =
  LazyValue.make(() => unsafeMake(Option.emptyOf<number>()))

/**
 * A `FiberRef` containing a reference to the current `ReleaseMap`.
 */
export const currentReleaseMap: LazyValue<FiberRef.Runtime<ReleaseMap>> =
  LazyValue.make(() => unsafeMake(ReleaseMap.unsafeMake()))

/**
 * A `FiberRef` containing a reference to the current fiber `Scope`.
 */
export const forkScopeOverride: LazyValue<FiberRef.Runtime<Option<Scope>>> =
  LazyValue.make(() => unsafeMake<Option<Scope>>(Option.none, identity, (a, _) => a))

/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static ets/EffectOps environment
 */
export function effectEnvironment<R>(__tsplusTrace?: string): RIO<R, R> {
  return Effect.suspendSucceed(() => fiberRefGet(currentEnvironment.value))
}
