import { reduce_ } from "../../Array"
import { UnionToIntersection } from "../../Base/Apply"
import { eqStrict } from "../../Eq"
import { pipe } from "../../Function"
import * as M from "../../Map"
import { sequential } from "../Effect"
import { DefaultEnv, makeRuntime, Runtime } from "../Effect/runtime"
import { Exit } from "../Exit"
import { HasURI, mergeEnvironments, has, readService, HasType } from "../Has"
import { Managed, noop } from "../Managed/managed"
import { Finalizer, ReleaseMap, makeReleaseMap } from "../Managed/releaseMap"
import * as P from "../Promise"
import * as R from "../Ref"
import * as RM from "../RefM"
import { Erase } from "../Utils"

import * as T from "./deps"

export class Layer<S, R, E, A> {
  constructor(readonly build: T.Managed<S, R, E, A>) {}

  memo(): Layer<unknown, R & HasMemoMap, E, A> {
    return memo(this)
  }

  fresh(): Layer<S, R, E, A> {
    return fresh(this)
  }
}

export type AsyncR<R, A> = Layer<unknown, R, never, A>

export const pure = <T>(has: T.Has<T>) => (resource: T) =>
  new Layer<never, unknown, never, T.Has<T>>(
    T.managedChain_(T.fromEffect(T.succeedNow(resource)), (a) => environmentFor(has, a))
  )

export const prepare = <T>(has: T.Has<T>) => <S, R, E, A extends T>(
  acquire: T.Effect<S, R, E, A>
) => ({
  open: <S1, R1, E1>(open: (_: A) => T.Effect<S1, R1, E1, any>) => ({
    release: <S2, R2, E2>(release: (_: A) => T.Effect<S2, R2, E2, any>) =>
      fromManaged(has)(
        T.managedChain_(
          T.makeExit_(acquire, (a) => release(a)),
          (a) => T.fromEffect(T.map_(open(a), () => a))
        )
      )
  }),
  release: <S2, R2, E2>(release: (_: A) => T.Effect<S2, R2, E2, any>) =>
    fromManaged(has)(T.makeExit_(acquire, (a) => release(a)))
})

export const service = <T>(has: T.Has<T>) => ({
  fromEffect: fromEffect(has),
  fromManaged: fromManaged(has),
  pure: pure(has),
  prepare: prepare(has)
})

export const fromEffect = <T>(has: T.Has<T>) => <S, R, E>(
  resource: T.Effect<S, R, E, T>
) =>
  new Layer<S, R, E, T.Has<T>>(
    T.managedChain_(T.fromEffect(resource), (a) => environmentFor(has, a))
  )

export const fromManaged = <T>(has: T.Has<T>) => <S, R, E>(
  resource: T.Managed<S, R, E, T>
) =>
  new Layer<S, R, E, T.Has<T>>(T.managedChain_(resource, (a) => environmentFor(has, a)))

export const fromManagedEnv = <S, R, E, A>(resource: T.Managed<S, R, E, A>) =>
  new Layer<S, R, E, A>(resource)

export const fromEffectEnv = <S, R, E, A>(resource: T.Effect<S, R, E, A>) =>
  new Layer<S, R, E, A>(T.fromEffect(resource))

export const zip_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    T.managedChain_(left.build, (l) =>
      T.managedChain_(right.build, (r) =>
        T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
      )
    )
  )

export const using = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => using_<S, R, E, A, S2, R2, E2, A2>(left, right)

export const using_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, Erase<R, A2> & R2, E | E2, A & A2>(
    T.managedChain_(right.build, (a2) =>
      T.managedMap_(
        T.managedProvideSome_(left.build, (r0: R) => ({
          ...r0,
          ...a2
        })),
        (a) => ({ ...a2, ...a })
      )
    )
  )

export const consuming = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R & A2, E, A>
) => consuming_<S, R, E, A, S2, R2, E2, A2>(left, right)

export const consuming_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R & A2, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<S | S2, R & R2, E | E2, A & A2>(
    T.managedChain_(right.build, (a2) =>
      T.managedMap_(
        T.managedProvideSome_(left.build, (r0: R & R2) => ({
          ...r0,
          ...a2
        })),
        (a) => ({ ...a2, ...a })
      )
    )
  )

export const zipPar = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => zipPar_(left, right)

export const zipPar_ = <S, R, E, A, S2, R2, E2, A2>(
  left: Layer<S, R, E, A>,
  right: Layer<S2, R2, E2, A2>
) =>
  new Layer<unknown, R & R2, E | E2, A & A2>(
    T.managedChain_(
      T.managedZipWithPar_(left.build, right.build, (a, b) => [a, b] as const),
      ([l, r]) => T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
    )
  )

export type MergeS<Ls extends Layer<any, any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any, any>] ? X : never
}[number]

export type MergeR<Ls extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export type MergeE<Ls extends Layer<any, any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends Layer<any, any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export const all = <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<MergeS<Ls>, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.managedForeach_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )

export const allPar = <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<unknown, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.foreachPar_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )

export const allParN = (n: number) => <Ls extends Layer<any, any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any, any> }
): Layer<unknown, MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
  new Layer(
    T.managedMap_(
      T.foreachParN_(n)(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )

function environmentFor<T>(
  has: T.Has<T>,
  a: T
): T.Managed<never, unknown, never, T.Has<T>>
function environmentFor<T>(has: T.Has<T>, a: T): T.Managed<never, unknown, never, any> {
  return T.fromEffect(
    T.access((r) => ({
      [has[HasURI].key]: mergeEnvironments(has, r, a as any)[has[HasURI].key]
    }))
  )
}

/**
 * Type level bound to make sure a layer is complete
 */
export const main = <S, E, A>(layer: Layer<S, DefaultEnv, E, A>) => layer

/**
 * Embed the requird environment in a region
 */
export const region = <K, T>(h: T.Has<T.Region<T, K>>) => <S, R, E>(
  _: Layer<S, R, E, T>
): Layer<S, R, E, T.Has<T.Region<T, K>>> =>
  pipe(
    fromEffectEnv(
      T.access((r: T): T.Has<T.Region<T, K>> => ({ [h[HasURI].key]: r } as any))
    ),
    consuming(_)
  )

/**
 * Converts a layer to a managed runtime
 */
export const toRuntime = <S, R, E, A>(
  _: Layer<S, R, E, A>
): Managed<S, R, E, Runtime<A>> => T.managedMap_(_.build, makeRuntime)

/**
 * A `MemoMap` memoizes dependencies.
 */
export class MemoMap {
  constructor(
    readonly ref: RM.RefM<
      M.Map<Layer<any, any, any, any>, [T.AsyncE<any, any>, Finalizer]>
    >
  ) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <S, R, E, A>(layer: Layer<S, R, E, A>) =>
    new Managed<unknown, R, E, A>(
      pipe(
        this.ref,
        RM.modify((m) => {
          const inMap = m.get(layer)

          if (inMap) {
            const [acquire, release] = inMap

            const cached = T.accessM(([_, rm]: [R, ReleaseMap]) =>
              pipe(
                acquire as T.AsyncE<E, A>,
                T.onExit((ex) => {
                  switch (ex._tag) {
                    case "Success": {
                      return rm.add(release)
                    }
                    case "Failure": {
                      return T.unit
                    }
                  }
                }),
                T.map((x) => [release, x] as [Finalizer, A])
              )
            )

            return T.succeedNow([cached, m])
          } else {
            return pipe(
              T.of,
              T.bind("observers", () => R.makeRef(0)),
              T.bind("promise", () => P.make<E, A>()),
              T.bind("finalizerRef", () => R.makeRef<Finalizer>(noop)),
              T.let("resource", ({ finalizerRef, observers, promise }) =>
                T.uninterruptibleMask(({ restore }) =>
                  pipe(
                    T.of,
                    T.bind("env", () => T.environment<[R, ReleaseMap]>()),
                    T.let("a", ({ env: [a] }) => a),
                    T.let(
                      "outerReleaseMap",
                      ({ env: [_, outerReleaseMap] }) => outerReleaseMap
                    ),
                    T.bind("innerReleaseMap", () => makeReleaseMap),
                    T.bind("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          T.provideAll_(layer.build.effect, [a, innerReleaseMap]),
                          T.result,
                          T.chain((e) => {
                            switch (e._tag) {
                              case "Failure": {
                                return pipe(
                                  promise,
                                  P.halt(e.cause),
                                  T.chain(
                                    () =>
                                      innerReleaseMap.releaseAll(
                                        e,
                                        sequential
                                      ) as T.AsyncE<E, any>
                                  ),
                                  T.chain(() => T.halt(e.cause))
                                )
                              }
                              case "Success": {
                                return pipe(
                                  T.of,
                                  T.tap(() =>
                                    finalizerRef.set((e) =>
                                      T.whenM(
                                        pipe(
                                          observers,
                                          R.modify((n) => [n === 1, n - 1])
                                        )
                                      )(
                                        innerReleaseMap.releaseAll(
                                          e,
                                          sequential
                                        ) as T.AsyncE<E, any>
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
                                    outerReleaseMap.add((e) =>
                                      T.chain_(finalizerRef.get, (f) => f(e))
                                    )
                                  ),
                                  T.tap(() => pipe(promise, P.succeed(e.value[1]))),
                                  T.map(
                                    ({ outerFinalizer }) =>
                                      [outerFinalizer, e.value[1]] as [Finalizer, A]
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
                      P.wait,
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
                  ] as [T.AsyncE<any, any>, Finalizer]
              ),
              T.map(({ memoized, resource }) => [
                resource as T.Effect<unknown, [R, ReleaseMap], E, [Finalizer, A]>,
                M.insertAt_(eqStrict)(m, layer, memoized) as M.Map<
                  Layer<any, any, any, any>,
                  [T.AsyncE<any, any>, Finalizer]
                >
              ])
            )
          }
        }),
        T.flatten
      )
    )
}

export const HasMemoMap = has(MemoMap)
export type HasMemoMap = HasType<typeof HasMemoMap>

/**
 * A default memoMap is included in DefaultEnv,
 * this can be used to "scope" a portion of layers to use a different memo map
 */
export const memoMap =
  /*#__PURE__*/
  service(HasMemoMap).fromEffect(
    pipe(
      RM.makeRefM<M.Map<Layer<any, any, any, any>, [T.AsyncE<any, any>, Finalizer]>>(
        new Map()
      ),
      T.map((ref) => new MemoMap(ref))
    )
  )

/**
 * Memoize the current layer using a MemoMap
 */
export const memo = <S, R, E, A>(
  layer: Layer<S, R, E, A>
): Layer<unknown, T.Has<MemoMap> & R, E, A> =>
  pipe(
    T.fromEffect(readService(HasMemoMap)),
    T.managedChain((m) => m.getOrElseMemoize(layer)),
    fromManagedEnv
  )

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export const fresh = <S, R, E, A>(layer: Layer<S, R, E, A>): Layer<S, R, E, A> =>
  pipe(layer, consuming(memoMap))
