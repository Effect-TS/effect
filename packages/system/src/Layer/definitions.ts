import * as A from "../Array"
import type { Cause } from "../Cause"
import * as T from "../Effect"
import { sequential } from "../Effect/ExecutionStrategy"
import type { Exit } from "../Exit"
import { pipe, tuple } from "../Function"
import * as M from "../Managed"
import type { Finalizer, ReleaseMap } from "../Managed/ReleaseMap"
import * as RelMap from "../Managed/ReleaseMap"
import { insert } from "../Map"
import * as P from "../Promise"
import * as R from "../Ref"
import * as RM from "../RefM"
import { AtomicReference } from "../Support/AtomicReference"
import type { Erase, UnionToIntersection } from "../Utils"

export function fromRawEffect<R, E, A>(resource: T.Effect<R, E, A>): Layer<R, E, A> {
  return new LayerManaged(M.fromEffect(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B) {
  return fromRawEffect(T.access(f))
}

export function fromRawFunctionM<A, R, E, B>(f: (a: A) => T.Effect<R, E, B>) {
  return fromRawEffect(T.accessM(f))
}

export function and_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerZipWithPar(self, that, (l, r) => ({ ...l, ...r }))
}

export function fold_<R, E, A, E1, B, R2, E2, C>(
  self: Layer<R, E, A>,
  failure: Layer<readonly [R, Cause<E>], E1, B>,
  success: Layer<A & R2, E2, C>
): Layer<R & R2, E1 | E2, B | C> {
  return new LayerFold<R, E, E1, E2, A, R2, B, C>(self, failure, success)
}

export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  from: Layer<R2, E2, A2>,
  noErase: "no-erase"
): Layer<R & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2>
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    from,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    and_(from, self)
  )
}

export function andTo<R, E, A>(to: Layer<R, E, A>) {
  return <R2, E2, A2>(self: Layer<R2, E2, A2>) => andTo_(self, to)
}

export function andTo_<R, E, A, R2, E2, A2>(
  self: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    self,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    and_(self, to)
  )
}

export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  to: Layer<R2, E2, A2>,
  noErase: "no-erase"
): Layer<R & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A>
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    to,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    self
  )
}

export abstract class Layer<RIn, E, ROut> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol())

  readonly _RIn!: (_: RIn) => void
  readonly _E!: () => E
  readonly _ROut!: () => ROut

  setKey(hash: symbol) {
    this.hash.set(hash)
    return this
  }

  ["_I"](): LayerInstruction {
    return this as any
  }

  ["<<<"]<R2, E2, A2>(
    from: Layer<R2, E2, A2>
  ): Layer<Erase<RIn, A2> & R2, E2 | E, ROut> {
    return from_(this, from)
  }

  [">>>"]<R2, E2, A2>(
    from: Layer<R2, E2, A2>
  ): Layer<Erase<R2, ROut> & RIn, E2 | E, A2> {
    return from_(from, this)
  }

  ["<+<"]<R2, E2, A2>(
    from: Layer<R2, E2, A2>
  ): Layer<Erase<RIn, A2> & R2, E2 | E, ROut & A2> {
    return using_(this, from)
  }

  [">+>"]<R2, E2, A2>(
    from: Layer<R2, E2, A2>
  ): Layer<Erase<R2, ROut> & RIn, E2 | E, ROut & A2> {
    return andTo_(this, from)
  }

  ["+++"]<R2, E2, A2>(from: Layer<R2, E2, A2>): Layer<R2 & RIn, E2 | E, ROut & A2> {
    return and_(from, this)
  }

  use<R, E1, A>(effect: T.Effect<R & ROut, E1, A>): T.Effect<RIn & R, E | E1, A> {
    return T.provideSomeLayer(this)(effect)
  }
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

export class LayerFold<RIn, E, E1, E2, ROut, R, ROut1, ROut2> extends Layer<
  RIn & R,
  E1 | E2,
  ROut1 | ROut2
> {
  readonly _tag = "LayerFold"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly failure: Layer<readonly [RIn, Cause<E>], E1, ROut1>,
    readonly success: Layer<ROut & R, E2, ROut2>
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
          M.foreachPar_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.reduce({} as any, (b, a) => ({ ...b, ...a })))
        )
      })
    }
    case "LayerAllSeq": {
      return M.succeed((memo) => {
        return pipe(
          M.foreach_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.reduce({} as any, (b, a) => ({ ...b, ...a })))
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
                M.provideSome_(memo.getOrElseMemoize(I.failure), () => tuple(r, e))
              )
            ),
          (r) =>
            M.provideSome_(memo.getOrElseMemoize(I.success), (x) =>
              typeof x === "object" && typeof r === "object"
                ? {
                    ...x,
                    ...r
                  }
                : r
            )
        )
      )
    }
  }
}

export function build<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, A> {
  return pipe(
    M.do,
    M.bind("memoMap", () => M.fromEffect(makeMemoMap())),
    M.bind("run", () => scope(_)),
    M.bind("value", ({ memoMap, run }) => run(memoMap)),
    M.map(({ value }) => value)
  )
}

export function makeMemoMap() {
  return pipe(
    RM.makeRefM<ReadonlyMap<PropertyKey, readonly [T.IO<any, any>, Finalizer]>>(
      new Map()
    ),
    T.chain((r) => T.effectTotal(() => new MemoMap(r)))
  )
}

/**
 * A `MemoMap` memoizes dependencies.
 */
export class MemoMap {
  constructor(
    readonly ref: RM.RefM<
      ReadonlyMap<PropertyKey, readonly [T.IO<any, any>, Finalizer]>
    >
  ) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) => {
    return new M.Managed<R, E, A>(
      pipe(
        this.ref,
        RM.modify((m) => {
          const inMap = m.get(layer.hash.get)

          if (inMap) {
            const [acquire, release] = inMap

            const cached = T.accessM(([_, rm]: readonly [R, ReleaseMap]) =>
              pipe(
                acquire as T.IO<E, A>,
                T.onExit((ex) => {
                  switch (ex._tag) {
                    case "Success": {
                      return RelMap.add(release)(rm)
                    }
                    case "Failure": {
                      return T.unit
                    }
                  }
                }),
                T.map((x) => [release, x] as readonly [Finalizer, A])
              )
            )

            return T.succeed(tuple(cached, m))
          } else {
            return pipe(
              T.do,
              T.bind("observers", () => R.makeRef(0)),
              T.bind("promise", () => P.make<E, A>()),
              T.bind("finalizerRef", () => R.makeRef<Finalizer>(RelMap.noopFinalizer)),
              T.let("resource", ({ finalizerRef, observers, promise }) =>
                T.uninterruptibleMask(({ restore }) =>
                  pipe(
                    T.do,
                    T.bind("env", () => T.environment<readonly [R, ReleaseMap]>()),
                    T.let("a", ({ env: [a] }) => a),
                    T.let(
                      "outerReleaseMap",
                      ({ env: [_, outerReleaseMap] }) => outerReleaseMap
                    ),
                    T.bind("innerReleaseMap", () => RelMap.makeReleaseMap),
                    T.bind("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          T.provideAll_(
                            pipe(
                              scope(layer),
                              M.chain((_) => _(this))
                            ).effect,
                            [a, innerReleaseMap]
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
                                      RelMap.releaseAll(
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
                                          R.modify((n) => [n === 1, n - 1])
                                        )
                                      )(
                                        RelMap.releaseAll(
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
                                    RelMap.add((e) =>
                                      T.chain_(finalizerRef.get, (f) => f(e))
                                    )(outerReleaseMap)
                                  ),
                                  T.tap(() => pipe(promise, P.succeed(e.value[1]))),
                                  T.map(({ outerFinalizer }) =>
                                    tuple(outerFinalizer, e.value[1])
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
              T.let(
                "memoized",
                ({ finalizerRef, observers, promise }) =>
                  [
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
                  ] as readonly [T.IO<any, any>, Finalizer]
              ),
              T.map(({ memoized, resource }) =>
                tuple(
                  resource as T.Effect<
                    readonly [R, ReleaseMap],
                    E,
                    readonly [Finalizer, A]
                  >,
                  insert(layer.hash.get, memoized)(m) as ReadonlyMap<
                    symbol,
                    readonly [T.IO<any, any>, Finalizer]
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
