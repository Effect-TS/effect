import type { Chunk } from "../../../collection/immutable/Chunk/core"
import { empty as emptyChunk } from "../../../collection/immutable/Chunk/core"
import * as Tp from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import * as E from "../../../data/Either"
import { identity } from "../../../data/Function"
import { LazyValue } from "../../../data/LazyValue"
import * as O from "../../../data/Option"
import type { Effect, IO, RIO, UIO } from "../../Effect/definition/base"
import { IFiberRefLocally, IFiberRefModify } from "../../Effect/definition/primitives"
import { acquireRelease_ } from "../../Effect/operations/acquireRelease"
import { chain_ } from "../../Effect/operations/chain"
import { failNow } from "../../Effect/operations/failNow"
import { uninterruptible } from "../../Effect/operations/interruption"
import { map_ } from "../../Effect/operations/map"
import { succeedNow } from "../../Effect/operations/succeedNow"
import { suspendSucceed } from "../../Effect/operations/suspendSucceed"
import type { LogLevel } from "../../LogLevel"
import { Info } from "../../LogLevel/definition"
import type { LogSpan } from "../../LogSpan"
import type { Managed } from "../../Managed/definition"
import { managedApply } from "../../Managed/definition"
import { asUnit } from "../../Managed/operations/asUnit"
import type { ReleaseMap } from "../../Managed/ReleaseMap"
import { add_ } from "../../Managed/ReleaseMap/add"
import { unsafeMake as unsafeMakeReleaseMap } from "../../Managed/ReleaseMap/make"
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
    return E.right(this.initial)
  }

  get get(): IO<never, A> {
    return this.modify((v) => Tp.tuple(v, v))
  }

  set(value: A, __trace?: string): IO<never, void> {
    return this.modify(() => Tp.tuple(undefined, value), __trace)
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
    return new DerivedAll((f) => f(this, E.chain_(this.initialValue, bd), bd, ca))
  }

  locally(
    value: A,
    __trace?: string
  ): <R, EC, C>(use: Effect<R, EC, C>) => Effect<R, EC, C> {
    return (use) => new IFiberRefLocally(value, this, use, __trace)
  }

  locallyManaged(value: A, __trace?: string): Managed<unknown, never, void> {
    return asUnit(
      managedApply(
        uninterruptible(
          chain_(effectEnvironment<unknown>(), (r) =>
            chain_(fiberRefGet(currentReleaseMap.value), (releaseMap) =>
              chain_(
                chain_(this.get, (old) => map_(this.set(value), () => old)),
                (a) =>
                  map_(
                    add_(releaseMap, () =>
                      locally_(
                        currentEnvironment.value,
                        r,
                        __trace
                      )(this.set(a) as UIO<any>)
                    ),
                    (releaseMapEntry) => Tp.tuple(releaseMapEntry, a)
                  )
              )
            )
          )
        )
      )
    )
  }

  modify<B>(f: (a: A) => Tp.Tuple<[B, A]>, __trace?: string): UIO<B> {
    return new IFiberRefModify(this, f, __trace)
  }
}

export class Derived<EA, EB, A, B> extends XFiberRefInternal<EA, EB, A, B> {
  readonly _tag = "Derived"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get initialValue(): E.Either<EB, B> {
    return this.use((value, getEither) => E.chain_(value.initialValue, getEither))
  }

  get get(): IO<EB, B> {
    return this.use((value, getEither) =>
      chain_(value.get, (s) => E.fold_(getEither(s), fail, succeedNow))
    )
  }

  set(a: A, __trace?: string): IO<EA, void> {
    return this.use((value, _, setEither) =>
      E.fold_(
        setEither(a),
        (e) => failNow(e, __trace),
        (s) => value.set(s, __trace)
      )
    )
  }

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ec: (eb: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            E.chain_(E.mapLeft_(this.initialValue, eb), bd),
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              E.chain_(
                E.fold_(getEither(s), (e) => E.left(ec(e)), ca(c)),
                (a) => E.fold_(setEither(a), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  locally(a: A, __trace?: string) {
    return <R, EC, C>(use: Effect<R, EC, C>): Effect<R, EA | EC, C> =>
      this.use((value, _, setEither) =>
        chain_(value.get, (old) =>
          E.fold_(
            setEither(a),
            (e) => failNow<EA | EC>(e),
            (s) => acquireRelease_(value.set(s), use, value.set(old))
          )
        )
      )
  }

  locallyManaged(a: A, __trace?: string): Managed<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      asUnit(
        managedApply(
          uninterruptible(
            chain_(effectEnvironment<unknown>(), (r) =>
              chain_(fiberRefGet(currentReleaseMap.value), (releaseMap) =>
                chain_(
                  chain_(value.get, (old) =>
                    E.fold_(
                      setEither(a),
                      (e) => fail(e),
                      (s) => map_(value.set(s), () => old)
                    )
                  ),
                  (a) =>
                    map_(
                      add_(releaseMap, (ex) =>
                        locally_(
                          currentEnvironment.value,
                          r,
                          __trace
                        )(value.set(a) as UIO<any>)
                      ),
                      (releaseMapEntry) => Tp.tuple(releaseMapEntry, a)
                    )
                )
              )
            )
          )
        )
      )
    )
  }
}

export class DerivedAll<EA, EB, A, B> extends XFiberRefInternal<EA, EB, A, B> {
  readonly _tag = "DerivedAll"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Runtime<S>,
        initialValue: E.Either<EB, B>,
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get initialValue(): E.Either<EB, B> {
    return this.use((_, initialValue) => initialValue)
  }

  get get(): IO<EB, B> {
    return this.use((value, _, getEither) =>
      chain_(value.get, (s) => E.fold_(getEither(s), fail, succeedNow))
    )
  }

  set(a: A, __trace?: string): IO<EA, void> {
    return this.use((value, _, __, setEither) =>
      value.modify(
        (s) =>
          E.fold_(
            setEither(a)(s),
            (e) => Tp.tuple(E.leftW<EA, void>(e), s),
            (s) => Tp.tuple(E.rightW<void, EA>(undefined), s)
          ),
        __trace
      )
    )
  }

  fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ca: (c: C) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, initialValue, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            E.chain_(E.mapLeft_(initialValue, eb), bd),
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (eb: EB) => ED,
    ec: (eb: EB) => EC,
    ca: (c: C) => (b: B) => E.Either<EC, A>,
    bd: (b: B) => E.Either<ED, D>
  ): XFiberRef<EC, ED, C, D> {
    return this.use(
      (value, initialValue, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            E.chain_(E.mapLeft_(initialValue, eb), bd),
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              E.chain_(
                E.fold_(getEither(s), (e) => E.left(ec(e)), ca(c)),
                (a) => E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  locally(a: A, __trace?: string) {
    return <R, EC, C>(use: Effect<R, EC, C>): Effect<R, EA | EC, C> =>
      this.use((value, _, __, setEither) =>
        chain_(
          value.get,
          (old) =>
            E.fold_(
              setEither(a)(old),
              (e) => failNow<EA | EC>(e),
              (s) => acquireRelease_(value.set(s), use, value.set(old))
            ),
          __trace
        )
      )
  }

  locallyManaged(a: A, __trace?: string): Managed<unknown, EA, void> {
    return this.use((value, _, __, setEither) =>
      asUnit(
        managedApply(
          uninterruptible(
            chain_(effectEnvironment<unknown>(), (r) =>
              chain_(fiberRefGet(currentReleaseMap.value), (releaseMap) =>
                chain_(
                  chain_(value.get, (old) =>
                    E.fold_(setEither(a)(old), fail, (s) =>
                      map_(value.set(s), () => old)
                    )
                  ),
                  (a) =>
                    map_(
                      add_(releaseMap, () =>
                        locally_(
                          currentEnvironment.value,
                          r,
                          __trace
                        )(value.set(a) as UIO<any>)
                      ),
                      (releaseMapEntry) => Tp.tuple(releaseMapEntry, a)
                    )
                )
              )
            )
          )
        )
      )
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
  __trace?: string
): UIO<FiberRef.Runtime<A>> {
  return suspendSucceed(() => {
    const ref = unsafeMake(initial, fork, join)
    return map_(update_(ref, identity), () => ref)
  }, __trace)
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
export const currentLogSpan: LazyValue<FiberRef.Runtime<Chunk<LogSpan>>> =
  LazyValue.make(() => unsafeMake(emptyChunk()))

/**
 * A `FiberRef` containing a reference to the current operation parallelism.
 */
export const currentParallelism: LazyValue<FiberRef.Runtime<O.Option<number>>> =
  LazyValue.make(() => unsafeMake(O.emptyOf<number>()))

/**
 * A `FiberRef` containing a reference to the current `ReleaseMap`.
 */
export const currentReleaseMap: LazyValue<FiberRef.Runtime<ReleaseMap>> =
  LazyValue.make(() => unsafeMake(unsafeMakeReleaseMap()))

/**
 * A `FiberRef` containing a reference to the current fiber `Scope`.
 */
export const forkScopeOverride: LazyValue<FiberRef.Runtime<O.Option<Scope>>> =
  LazyValue.make(() => unsafeMake<O.Option<Scope>>(O.none, identity, (a, _) => a))

/**
 * Accesses the whole environment of the effect.
 *
 * @ets static ets/EffectOps environment
 */
export function effectEnvironment<R>(__trace?: string): RIO<R, R> {
  return suspendSucceed(() => fiberRefGet(currentEnvironment.value), __trace)
}
