// ets_tracing: off

import type * as C from "../Cause"
import * as Chunk from "../Collections/Immutable/Chunk"
import { insert } from "../Collections/Immutable/Map"
import * as Tp from "../Collections/Immutable/Tuple"
import { _E, _RIn, _ROut } from "../Effect/commons"
import { sequential } from "../Effect/ExecutionStrategy"
import type { Exit } from "../Exit"
import { pipe } from "../Function"
import { environment } from "../Managed/methods/environment"
import type { ReleaseMap } from "../Managed/ReleaseMap"
import * as add from "../Managed/ReleaseMap/add"
import * as Finalizer from "../Managed/ReleaseMap/finalizer"
import * as makeReleaseMap from "../Managed/ReleaseMap/makeReleaseMap"
import * as releaseAll from "../Managed/ReleaseMap/releaseAll"
import * as P from "../Promise"
import * as R from "../Ref"
import * as RM from "../RefM"
import { AtomicReference } from "../Support/AtomicReference"
import type { Erase, UnionToIntersection } from "../Utils"
import * as T from "./deps-effect"
import * as M from "./deps-managed"

/**
 * Creates a layer from an effect
 */
export function fromRawEffect<R, E, A>(resource: T.Effect<R, E, A>): Layer<R, E, A> {
  return new LayerManaged(M.fromEffect(resource))
}

/**
 * Creates a layer from a function
 */
export function fromRawFunction<A, B>(f: (a: A) => B) {
  return fromRawEffect(T.access(f))
}

/**
 * Creates a layer from an effectful function
 */
export function fromRawFunctionM<A, R, E, B>(f: (a: A) => T.Effect<R, E, B>) {
  return fromRawEffect(T.accessM(f))
}

/**
 * Creates a layer from a managed environment
 */
export function fromRawManaged<R, E, A>(resource: M.Managed<R, E, A>): Layer<R, E, A> {
  return new LayerManaged(resource)
}

/**
 * Constructs a layer that passes along the specified environment as an
 * output.
 */
export function identity<R>() {
  return fromRawManaged(environment<R>())
}

/**
 * Merge two Layers in parallel without providing any data to each other
 *
 * @param self - first Layer to combine
 * @param that - second Layer to combine
 */
export function and_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerZipWithPar(self, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Merge two Layers in parallel without providing any data to each other
 *
 * @param that - second Layer to combine
 * @param self - first Layer to combine
 */
export function and<R2, E2, A2>(
  that: Layer<R2, E2, A2>
): <R, E, A>(self: Layer<R, E, A>) => Layer<R & R2, E | E2, A & A2> {
  return (self) => new LayerZipWithPar(self, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 */
export function fold<R, E, A>(self: Layer<R, E, A>) {
  return <R2, E2, A2>(failure: Layer<Tp.Tuple<[R2, C.Cause<E>]>, E2, A2>) =>
    <E3, A3>(success: Layer<A, E3, A3>): Layer<R & R2, E3 | E2, A3 | A2> =>
      new LayerFold<R, E, A, R2, E2, A2, E3, A3>(self, failure, success)
}

/**
 * Use `from` to partially provide environment into `to`
 */
export function using<R2, E2, A2>(from: Layer<R2, E2, A2>) {
  return <R, E, A>(to: Layer<A2 & R, E, A>): Layer<R2 & R, E2 | E, A> =>
    compose_(from["+++"](identity<R>()), to)
}

/**
 * Use `from` to partially provide environment into `to` and merge both
 */
export function usingAnd<R2, E2, A2>(from: Layer<R2, E2, A2>) {
  return <R, E, A>(to: Layer<A2 & R, E, A>): Layer<R2 & R, E2 | E, A & A2> =>
    compose_(from["+++"](identity<R>()), to["+++"](identity<A2>()))
}

/**
 * Compose layers
 */
export function compose_<R2, E2, A2, E, A>(
  from: Layer<R2, E2, A2>,
  to: Layer<A2, E, A>
): Layer<R2, E2 | E, A> {
  return fold(from)(
    fromRawFunctionM((_: Tp.Tuple<[unknown, C.Cause<E2>]>) => T.halt(_.get(1)))
  )(to)
}

/**
 * Compose layers
 */
export function compose<A2, E, A>(
  to: Layer<A2, E, A>
): <R2, E2>(from: Layer<R2, E2, A2>) => Layer<R2, E2 | E, A> {
  return (from) => compose_(from, to)
}

export const hashSym: unique symbol = Symbol()

export abstract class Layer<RIn, E, ROut> {
  readonly [hashSym] = new AtomicReference<PropertyKey>(Symbol());

  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut

  /**
   * Set the hash key for memoization
   */
  setKey(hash: PropertyKey) {
    this[hashSym].set(hash)
    return this
  }

  ["_I"](): LayerInstruction {
    return this as any
  }

  /**
   * Use that Layer to provide data to this
   */
  ["<=<"]<R2, E2>(that: Layer<R2, E2, RIn>): Layer<R2, E2 | E, ROut> {
    return that[">=>"](this)
  }

  /**
   * Use this Layer to provide data to that
   */
  [">=>"]<E2, A2>(that: Layer<ROut, E2, A2>): Layer<RIn, E2 | E, A2> {
    return compose_(this, that)
  }

  /**
   * Use that Layer to partially provide data to this
   */
  ["<<<"]<R2, E2, A2>(
    that: Layer<R2, E2, A2>
  ): Layer<Erase<RIn, A2> & R2, E2 | E, ROut> {
    return that[">>>"](this)
  }

  /**
   * Use this Layer to partially provide data to that
   */
  [">>>"]<R2, E2, A2>(that: Layer<R2, E2, A2>): Layer<Erase<R2, ROut> & RIn, E2 | E, A2>
  [">>>"]<R2, E2, A2>(that: Layer<R2 & ROut, E2, A2>): Layer<R2 & RIn, E2 | E, A2> {
    return this["+++"](identity<R2>())[">=>"](that)
  }

  /**
   * Create a Layer with the data from both Layers, while providing the data from this to that
   */
  [">+>"]<R2, E2, A2>(
    that: Layer<R2, E2, A2>
  ): Layer<RIn & Erase<ROut & R2, ROut>, E2 | E, ROut & A2> {
    return this[">>>"](that["+++"](identity<ROut>()))
  }

  /**
   * Create a Layer with the data from both Layers, while providing the data from that to this
   */
  ["<+<"]<R2, E2, A2>(
    that: Layer<R2, E2, A2>
  ): Layer<Erase<RIn & A2, A2> & R2, E | E2, ROut & A2> {
    return that[">+>"](this)
  }

  /**
   * Combine both layers in parallel
   */
  ["+++"]<R2, E2, A2>(from: Layer<R2, E2, A2>): Layer<R2 & RIn, E2 | E, ROut & A2> {
    return and_(from, this)
  }

  /**
   * Use the layer to provide partial environment to an effect
   */
  use<R, E1, A>(effect: T.Effect<R & ROut, E1, A>): T.Effect<RIn & R, E | E1, A> {
    return provideSomeLayer(this)(effect)
  }

  /**
   * Use the layer to provide the full environment to an effect
   */
  useAll<E1, A>(effect: T.Effect<ROut, E1, A>): T.Effect<RIn, E | E1, A> {
    return provideLayer(this)(effect)
  }

  /**
   * Use the layer to provide the full environment to an effect
   */
  get useForever(): T.Effect<RIn, E, never> {
    return provideLayer(this)(T.never)
  }
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer<R, E, A>(layer: Layer<R, E, A>) {
  return <R1, E1, A1>(self: T.Effect<R1 & A, E1, A1>): T.Effect<R & R1, E | E1, A1> =>
    provideLayer_(self, layer["+++"](identity()))
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer_<R1, E1, A1, R, E, A>(
  self: T.Effect<R1 & A, E1, A1>,
  layer: Layer<R, E, A>
): T.Effect<R & R1, E | E1, A1> {
  return provideLayer_(self, layer["+++"](identity()))
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: T.Effect<A, E1, A1>,
  layer: Layer<R, E, A>
): T.Effect<R, E | E1, A1> {
  return M.use_(build(layer), (p) => T.provideAll_(self, p))
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer<R, E, A>(layer: Layer<R, E, A>) {
  return <E1, A1>(self: T.Effect<A, E1, A1>) => provideLayer_(self, layer)
}

export type LayerInstruction =
  | LayerFold<any, any, any, any, any, any, any, any>
  | LayerFresh<any, any, any>
  | LayerManaged<any, any, any>
  | LayerSuspend<any, any, any>
  | LayerZipWithPar<any, any, any, any, any, any, any>
  | LayerZipWithSeq<any, any, any, any, any, any, any>
  | LayerAllPar<any>
  | LayerAllSeq<any>
  | LayerMap<any, any, any, any>
  | LayerChain<any, any, any, any, any, any>

export class LayerFold<R, E, A, R2, E2, A2, E3, A3> extends Layer<
  R & R2,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "LayerFold"

  constructor(
    readonly self: Layer<R, E, A>,
    readonly failure: Layer<Tp.Tuple<[R2, C.Cause<E>]>, E2, A2>,
    readonly success: Layer<A, E3, A3>
  ) {
    super()
  }
}

export class LayerMap<RIn, E, ROut, ROut1> extends Layer<RIn, E, ROut1> {
  readonly _tag = "LayerMap"

  constructor(readonly self: Layer<RIn, E, ROut>, readonly f: (a: ROut) => ROut1) {
    super()
  }
}

export class LayerChain<RIn, RIn2, E, E2, ROut, ROut1> extends Layer<
  RIn & RIn2,
  E | E2,
  ROut1
> {
  readonly _tag = "LayerChain"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly f: (a: ROut) => Layer<RIn2, E2, ROut1>
  ) {
    super()
  }
}

export class LayerFresh<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerFresh"

  constructor(readonly self: Layer<RIn, E, ROut>) {
    super()
  }
}

export class LayerManaged<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerManaged"

  constructor(readonly self: M.Managed<RIn, E, ROut>) {
    super()
  }
}

export class LayerSuspend<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerSuspend"

  constructor(readonly self: () => Layer<RIn, E, ROut>) {
    super()
  }
}

export class LayerZipWithPar<RIn, E, ROut, RIn1, E1, ROut2, ROut3> extends Layer<
  RIn & RIn1,
  E | E1,
  ROut3
> {
  readonly _tag = "LayerZipWithPar"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (s: ROut, t: ROut2) => ROut3
  ) {
    super()
  }
}

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export type MergeE<Ls extends Layer<any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export class LayerAllPar<Layers extends Layer<any, any, any>[]> extends Layer<
  MergeR<Layers>,
  MergeE<Layers>,
  MergeA<Layers>
> {
  readonly _tag = "LayerAllPar"

  constructor(readonly layers: Layers & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class LayerAllSeq<Layers extends Layer<any, any, any>[]> extends Layer<
  MergeR<Layers>,
  MergeE<Layers>,
  MergeA<Layers>
> {
  readonly _tag = "LayerAllSeq"

  constructor(readonly layers: Layers & { 0: Layer<any, any, any> }) {
    super()
  }
}

export class LayerZipWithSeq<RIn, E, ROut, RIn1, E1, ROut2, ROut3> extends Layer<
  RIn & RIn1,
  E | E1,
  ROut3
> {
  readonly _tag = "LayerZipWithSeq"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (s: ROut, t: ROut2) => ROut3
  ) {
    super()
  }
}

export function scope<R, E, A>(
  _: Layer<R, E, A>
): M.Managed<unknown, never, (_: MemoMap) => M.Managed<R, E, A>> {
  const I = _._I()

  switch (I._tag) {
    case "LayerFresh": {
      return M.succeed(() => build(I.self))
    }
    case "LayerManaged": {
      return M.succeed(() => I.self)
    }
    case "LayerSuspend": {
      return M.succeed((memo) => memo.getOrElseMemoize(I.self()))
    }
    case "LayerMap": {
      return M.succeed((memo) => M.map_(memo.getOrElseMemoize(I.self), I.f))
    }
    case "LayerChain": {
      return M.succeed((memo) =>
        M.chain_(memo.getOrElseMemoize(I.self), (a) => memo.getOrElseMemoize(I.f(a)))
      )
    }
    case "LayerZipWithPar": {
      return M.succeed((memo) =>
        M.zipWithPar_(memo.getOrElseMemoize(I.self), memo.getOrElseMemoize(I.that), I.f)
      )
    }
    case "LayerZipWithSeq": {
      return M.succeed((memo) =>
        M.zipWith_(memo.getOrElseMemoize(I.self), memo.getOrElseMemoize(I.that), I.f)
      )
    }
    case "LayerAllPar": {
      return M.succeed((memo) => {
        return pipe(
          M.forEachPar_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(Chunk.reduce({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case "LayerAllSeq": {
      return M.succeed((memo) => {
        return pipe(
          M.forEach_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(Chunk.reduce({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case "LayerFold": {
      return M.succeed((memo) =>
        M.foldCauseM_(
          memo.getOrElseMemoize(I.self),
          (e) =>
            pipe(
              M.fromEffect(T.environment<any>()),
              M.chain((r) =>
                M.provideSome_(memo.getOrElseMemoize(I.failure), () => Tp.tuple(r, e))
              )
            ),
          (r) => M.provideAll_(memo.getOrElseMemoize(I.success), r)
        )
      )
    }
  }
}

/**
 * Builds a layer into a managed value.
 */
export function build<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, A> {
  return pipe(
    M.do,
    M.bind("memoMap", () => M.fromEffect(makeMemoMap())),
    M.bind("run", () => scope(_)),
    M.bind("value", ({ memoMap, run }) => run(memoMap)),
    M.map(({ value }) => value)
  )
}

/**
 * Creates a MemoMap
 */
export function makeMemoMap() {
  return pipe(
    RM.makeRefM<
      ReadonlyMap<PropertyKey, Tp.Tuple<[T.IO<any, any>, Finalizer.Finalizer]>>
    >(new Map()),
    T.chain((r) => T.succeedWith(() => new MemoMap(r)))
  )
}

/**
 * A `MemoMap` memoizes dependencies.
 */
export class MemoMap {
  constructor(
    readonly ref: RM.RefM<
      ReadonlyMap<PropertyKey, Tp.Tuple<[T.IO<any, any>, Finalizer.Finalizer]>>
    >
  ) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) => {
    return M.managedApply<R, E, A>(
      pipe(
        this.ref,
        RM.modify((m) => {
          const inMap = m.get(layer[hashSym].get)

          if (inMap) {
            const {
              tuple: [acquire, release]
            } = inMap

            const cached = T.accessM(({ tuple: [_, rm] }: Tp.Tuple<[R, ReleaseMap]>) =>
              pipe(
                acquire as T.IO<E, A>,
                T.onExit((ex) => {
                  switch (ex._tag) {
                    case "Success": {
                      return add.add(release)(rm)
                    }
                    case "Failure": {
                      return T.unit
                    }
                  }
                }),
                T.map((x) => Tp.tuple(release, x))
              )
            )

            return T.succeed(Tp.tuple(cached, m))
          } else {
            return pipe(
              T.do,
              T.bind("observers", () => R.makeRef(0)),
              T.bind("promise", () => P.make<E, A>()),
              T.bind("finalizerRef", () =>
                R.makeRef<Finalizer.Finalizer>(Finalizer.noopFinalizer)
              ),
              T.let("resource", ({ finalizerRef, observers, promise }) =>
                T.uninterruptibleMask(({ restore }) =>
                  pipe(
                    T.do,
                    T.bind("env", () => T.environment<Tp.Tuple<[R, ReleaseMap]>>()),
                    T.let(
                      "a",
                      ({
                        env: {
                          tuple: [a]
                        }
                      }) => a
                    ),
                    T.let(
                      "outerReleaseMap",
                      ({
                        env: {
                          tuple: [_, outerReleaseMap]
                        }
                      }) => outerReleaseMap
                    ),
                    T.bind("innerReleaseMap", () => makeReleaseMap.makeReleaseMap),
                    T.bind("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          T.provideAll_(
                            pipe(
                              scope(layer),
                              M.chain((_) => _(this))
                            ).effect,
                            Tp.tuple(a, innerReleaseMap)
                          ),
                          T.result,
                          T.chain((e) => {
                            switch (e._tag) {
                              case "Failure": {
                                return pipe(
                                  promise,
                                  P.halt(e.cause),
                                  T.chain(
                                    () =>
                                      releaseAll.releaseAll(
                                        e,
                                        sequential
                                      )(innerReleaseMap) as T.IO<E, any>
                                  ),
                                  T.chain(() => T.halt(e.cause))
                                )
                              }
                              case "Success": {
                                return pipe(
                                  T.do,
                                  T.tap(() =>
                                    finalizerRef.set((e) =>
                                      T.whenM(
                                        pipe(
                                          observers,
                                          R.modify((n) => Tp.tuple(n === 1, n - 1))
                                        )
                                      )(
                                        releaseAll.releaseAll(
                                          e,
                                          sequential
                                        )(innerReleaseMap) as T.UIO<any>
                                      )
                                    )
                                  ),
                                  T.tap(() =>
                                    pipe(
                                      observers,
                                      R.update((n) => n + 1)
                                    )
                                  ),
                                  T.bind("outerFinalizer", () =>
                                    add.add((e) =>
                                      T.chain_(finalizerRef.get, (f) => f(e))
                                    )(outerReleaseMap)
                                  ),
                                  T.tap(() => pipe(promise, P.succeed(e.value.get(1)))),
                                  T.map(({ outerFinalizer }) =>
                                    Tp.tuple(outerFinalizer, e.value.get(1))
                                  )
                                )
                              }
                            }
                          })
                        )
                      )
                    ),
                    T.map(({ tp }) => tp)
                  )
                )
              ),
              T.let("memoized", ({ finalizerRef, observers, promise }) =>
                Tp.tuple(
                  pipe(
                    promise,
                    P.await,
                    T.onExit((e) => {
                      switch (e._tag) {
                        case "Failure": {
                          return T.unit
                        }
                        case "Success": {
                          return pipe(
                            observers,
                            R.update((n) => n + 1)
                          )
                        }
                      }
                    })
                  ),
                  (e: Exit<any, any>) => T.chain_(finalizerRef.get, (f) => f(e))
                )
              ),
              T.map(({ memoized, resource }) =>
                Tp.tuple(
                  resource as T.Effect<
                    Tp.Tuple<[R, ReleaseMap]>,
                    E,
                    Tp.Tuple<[Finalizer.Finalizer, A]>
                  >,
                  insert(layer[hashSym].get, memoized)(m) as ReadonlyMap<
                    symbol,
                    Tp.Tuple<[T.IO<any, any>, Finalizer.Finalizer]>
                  >
                )
              )
            )
          }
        }),
        T.flatten
      )
    )
  }
}

/**
 * Empty layer, useful for init cases
 */
export const Empty: Layer<unknown, never, unknown> = new LayerSuspend(() =>
  identity<unknown>()
)
