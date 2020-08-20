/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/ZLayer.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { reduce_ } from "../Array"
import { readService } from "../Effect/has"
import type { DefaultEnv, Runtime } from "../Effect/runtime"
import { makeRuntime } from "../Effect/runtime"
import { pipe, tuple } from "../Function"
import { HasURI, mergeEnvironments } from "../Has"
import type { Managed } from "../Managed/managed"
import type { Finalizer } from "../Managed/releaseMap"
import * as RM from "../RefM"
import type { Erase, UnionToIntersection } from "../Utils"
import * as T from "./deps"
import { Layer } from "./Layer"
import { HasMemoMap, MemoMap } from "./MemoMap"

export { Layer } from "./Layer"

export type AsyncR<R, A> = Layer<unknown, R, never, A>

export const pure = <T>(has: T.Has<T>) => (resource: T) =>
  new Layer<never, unknown, never, T.Has<T>>(
    T.managedChain_(T.fromEffect(T.succeedNow(resource)), (a) => environmentFor(has, a))
  )

export const prepare = <T>(has: T.Has<T>) => <S, R, E, A extends T>(
  acquire: T.Effect<S, R, E, A>
) => ({
  open: <S1, R1, E1>(open: (_: A) => T.Effect<S1, R1, E1, any>) => ({
    release: <S2, R2>(release: (_: A) => T.Effect<S2, R2, never, any>) =>
      fromManaged(has)(
        T.managedChain_(
          T.makeExit_(acquire, (a) => release(a)),
          (a) => T.fromEffect(T.map_(open(a), () => a))
        )
      )
  }),
  release: <S2, R2>(release: (_: A) => T.Effect<S2, R2, never, any>) =>
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
  new Layer<S | S2, R & R2, E | E2, readonly [A, A2]>(
    T.managedChain_(left.build, (l) =>
      T.managedChain_(right.build, (r) =>
        T.fromEffect(T.effectTotal(() => tuple(l, r)))
      )
    )
  )

export const zip = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => zip_(left, right)

export const merge_ = <S, R, E, A, S2, R2, E2, A2>(
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

export const merge = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => merge_(left, right)

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

export const mergePar = <S2, R2, E2, A2>(right: Layer<S2, R2, E2, A2>) => <S, R, E, A>(
  left: Layer<S, R, E, A>
) => mergePar_(left, right)

export const mergePar_ = <S, R, E, A, S2, R2, E2, A2>(
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
 * A default memoMap is included in DefaultEnv,
 * this can be used to "scope" a portion of layers to use a different memo map
 */
export const memoMap = service(HasMemoMap).fromEffect(
  pipe(
    RM.makeRefM<
      ReadonlyMap<Layer<any, any, any, any>, readonly [T.AsyncE<any, any>, Finalizer]>
    >(new Map()),
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
