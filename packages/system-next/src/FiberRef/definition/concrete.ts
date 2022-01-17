// ets_tracing: off

import type { Chunk } from "../../Collections/Immutable/Chunk"
import { empty as emptyChunk } from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { Effect, IO, UIO } from "../../Effect/definition/base"
import { IFiberRefLocally, IFiberRefModify } from "../../Effect/definition/primitives"
import { acquireRelease_ } from "../../Effect/operations/acquireRelease"
import { chain_ } from "../../Effect/operations/chain"
import { environment } from "../../Effect/operations/environment"
import { failNow } from "../../Effect/operations/failNow"
import { uninterruptible } from "../../Effect/operations/interruption"
import { map_ } from "../../Effect/operations/map"
import { succeedNow } from "../../Effect/operations/succeedNow"
import { suspendSucceed } from "../../Effect/operations/suspendSucceed"
import type { Either } from "../../Either"
import * as E from "../../Either"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { identity } from "../../Function"
import { LazyValue } from "../../LazyValue"
import * as LogLevel from "../../LogLevel"
import type { LogSpan } from "../../LogSpan"
import type { Managed } from "../../Managed/definition"
import { managedApply } from "../../Managed/definition"
import { asUnit } from "../../Managed/operations/asUnit"
import * as ReleaseMap from "../../Managed/ReleaseMap"
import * as O from "../../Option"
import type { Scope } from "../../Scope"
import { update_ } from "../operations/update"
import type { XFiberRef } from "./base"
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
          chain_(environment<unknown>(), (r) =>
            chain_(fiberRefGet(currentReleaseMap.value), (releaseMap) =>
              chain_(
                chain_(this.get, (old) => map_(this.set(value), () => old)),
                (a) =>
                  map_(
                    ReleaseMap.add_(releaseMap, () =>
                      locally_(
                        currentEnvironment.value,
                        r,
                        this.set(a) as UIO<any>,
                        __trace
                      )
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
            chain_(environment<unknown>(), (r) =>
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
                      ReleaseMap.add_(releaseMap, (ex) =>
                        locally_(
                          currentEnvironment.value,
                          r,
                          value.set(a) as UIO<any>,
                          __trace
                        )
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
            chain_(environment<unknown>(), (r) =>
              chain_(fiberRefGet(currentReleaseMap.value), (releaseMap) =>
                chain_(
                  chain_(value.get, (old) =>
                    E.fold_(setEither(a)(old), fail, (s) =>
                      map_(value.set(s), () => old)
                    )
                  ),
                  (a) =>
                    map_(
                      ReleaseMap.add_(releaseMap, () =>
                        locally_(
                          currentEnvironment.value,
                          r,
                          value.set(a) as UIO<any>,
                          __trace
                        )
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
 * @ets_optimize identity
 */
export function concrete<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): Runtime<A | B> | Derived<EA, EB, A, A> | DerivedAll<EA, EB, A, B> {
  return self as Runtime<A | B> | Derived<EA, EB, A, A> | DerivedAll<EA, EB, A, B>
}

/**
 * @ets_optimize remove
 */
export function concreteUnified<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>
): asserts self is XFiberRefInternal<EA, EB, A, B> {
  //
}

/**
 * Creates a new `FiberRef` with given initial value.
 */
export function make<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (x: A, y: A) => A = (_, a) => a,
  __trace?: string
): UIO<Runtime<A>> {
  return suspendSucceed(() => {
    const ref = unsafeMake(initial, fork, join)
    return map_(update_(ref, identity), () => ref)
  }, __trace)
}

export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (x: A, y: A) => A = (_, a) => a
): Runtime<A> {
  return new Runtime(initial, fork, join)
}

/**
 * A `FiberRef` containing a reference to the current environment.
 */
export const currentEnvironment: LazyValue<Runtime<any>> = LazyValue.make(() =>
  unsafeMake({} as any, identity, (a, _) => a)
)

/**
 * A `FiberRef` containing a reference to the current `LogLevel`.
 */
export const currentLogLevel: LazyValue<Runtime<LogLevel.LogLevel>> = LazyValue.make(
  () => unsafeMake(LogLevel.Info)
)

/**
 * A `FiberRef` containing a reference to the current list of `LogSpan`s.
 */
export const currentLogSpan: LazyValue<Runtime<Chunk<LogSpan>>> = LazyValue.make(() =>
  unsafeMake(emptyChunk())
)

/**
 * A `FiberRef` containing a reference to the current operation parallelism.
 */
export const currentParallelism: LazyValue<Runtime<O.Option<number>>> = LazyValue.make(
  () => unsafeMake(O.emptyOf<number>())
)

/**
 * A `FiberRef` containing a reference to the current `ReleaseMap`.
 */
export const currentReleaseMap: LazyValue<Runtime<ReleaseMap.ReleaseMap>> =
  LazyValue.make(() => unsafeMake(ReleaseMap.unsafeMake()))

/**
 * A `FiberRef` containing a reference to the current fiber `Scope`.
 */
export const forkScopeOverride: LazyValue<Runtime<O.Option<Scope>>> = LazyValue.make(
  () => unsafeMake<O.Option<Scope>>(O.none, identity, (a, _) => a)
)
