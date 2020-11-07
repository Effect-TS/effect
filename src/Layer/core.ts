import type { Cause } from "../Cause"
import * as T from "../Effect"
import { identity as idFn, pipe, tuple } from "../Function"
import type { Has, Tag } from "../Has"
import { mergeEnvironments } from "../Has"
import * as M from "../Managed"
import type { Erase, UnionToIntersection } from "../Utils"
import type { Layer, MergeA, MergeE, MergeR } from "./definitions"
import {
  and_,
  andTo_,
  build,
  fold_,
  fromRawEffect,
  fromRawFunctionM,
  LayerAllPar,
  LayerAllSeq,
  LayerChain,
  LayerFresh,
  LayerManaged,
  LayerMap,
  LayerZipWithSeq,
  using_
} from "./definitions"

export * from "./definitions"

function environmentFor<T>(has: Tag<T>, a: T): M.Managed<unknown, never, Has<T>>
function environmentFor<T>(has: Tag<T>, a: T): M.Managed<unknown, never, any> {
  return M.fromEffect(
    T.access((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

export function pure<T>(has: Tag<T>) {
  return (resource: T): Layer<unknown, never, Has<T>> =>
    new LayerManaged(
      M.chain_(M.fromEffect(T.succeed(resource)), (a) => environmentFor(has, a))
    )
}

export function prepare<T>(has: Tag<T>) {
  return <R, E, A extends T>(acquire: T.Effect<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => T.Effect<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
        fromManaged(has)(
          M.chain_(
            M.makeExit_(acquire, (a) => release(a)),
            (a) => M.fromEffect(T.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
      fromManaged(has)(M.makeExit_(acquire, (a) => release(a)))
  })
}

export function create<T>(has: Tag<T>) {
  return {
    fromEffect: fromEffect(has),
    fromManaged: fromManaged(has),
    pure: pure(has),
    prepare: prepare(has)
  }
}

export function fromEffect<T>(has: Tag<T>) {
  return <R, E>(resource: T.Effect<R, E, T>): Layer<R, E, Has<T>> =>
    new LayerManaged(M.chain_(M.fromEffect(resource), (a) => environmentFor(has, a)))
}

export function fromManaged<T>(has: Tag<T>) {
  return <R, E>(resource: M.Managed<R, E, T>): Layer<R, E, Has<T>> =>
    new LayerManaged(M.chain_(resource, (a) => environmentFor(has, a)))
}

export function fromFunction<B>(tag: Tag<B>) {
  return <A>(f: (a: A) => B): Layer<A, never, Has<B>> => fromEffect(tag)(T.access(f))
}

export function fromRawManaged<R, E, A>(resource: M.Managed<R, E, A>): Layer<R, E, A> {
  return new LayerManaged(resource)
}

export function zip_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> {
  return new LayerZipWithSeq(left, right, tuple)
}

export function zip<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => zip_(left, right)
}

export function to<R, E, A>(to: Layer<R, E, A>) {
  return <R2, E2, A2>(self: Layer<R2, E2, A2>) => to_(self, to)
}

export function to_<R, E, A, R2, E2, A2>(
  self: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    self,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    to
  )
}

export function using<R2, E2, A2>(
  self: Layer<R2, E2, A2>,
  noErase: "no-erase"
): <R, E, A>(to: Layer<R & A2, E, A>) => Layer<R & R2, E2 | E, A & A2>
export function using<R2, E2, A2>(
  self: Layer<R2, E2, A2>
): <R, E, A>(to: Layer<R, E, A>) => Layer<Erase<R, A2> & R2, E2 | E, A & A2>
export function using<R2, E2, A2>(
  self: Layer<R2, E2, A2>
): <R, E, A>(to: Layer<R, E, A>) => Layer<Erase<R, A2> & R2, E2 | E, A & A2> {
  return <R, E, A>(to: Layer<R, E, A>) => andTo_(self, to)
}

export function from<R2, E2, A2>(
  self: Layer<R2, E2, A2>,
  noErase: "no-erase"
): <R, E, A>(to: Layer<R & A2, E, A>) => Layer<R & R2, E2 | E, A>
export function from<R2, E2, A2>(
  self: Layer<R2, E2, A2>
): <R, E, A>(to: Layer<R, E, A>) => Layer<Erase<R, A2> & R2, E2 | E, A>
export function from<R2, E2, A2>(
  self: Layer<R2, E2, A2>
): <R, E, A>(to: Layer<R, E, A>) => Layer<Erase<R, A2> & R2, E2 | E, A> {
  return <R, E, A>(to: Layer<R, E, A>) => to_(self, to)
}

export function and<R2, E2, A2>(that: Layer<R2, E2, A2>) {
  return <R, E, A>(self: Layer<R, E, A>) => and_(self, that)
}

export function andSeq<R2, E2, A2>(that: Layer<R2, E2, A2>) {
  return <R, E, A>(self: Layer<R, E, A>) => and_(self, that)
}

export function andSeq_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerZipWithSeq(self, that, (l, r) => ({ ...l, ...r }))
}

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllPar(ls)
}

export function allSeq<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllSeq(ls)
}

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<T.DefaultEnv, E, A>) {
  return layer
}

/**
 * Embed the requird environment in a region
 */
export function region<K, T>(h: Tag<T.Region<T, K>>) {
  return <R, E>(_: Layer<R, E, T>): Layer<R, E, Has<T.Region<T, K>>> =>
    pipe(
      fromRawEffect(T.access((r: T): Has<T.Region<T, K>> => ({ [h.key]: r } as any))),
      using(_, "no-erase")
    )
}

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, T.Runtime<A>> {
  return M.map_(build(_), T.makeRuntime)
}

/**
 * Discards any memoized version
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return new LayerFresh(layer)
}

/**
 * Maps the output of the layer using f
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(fa: Layer<R, E, A>): Layer<R, E, B> => map_(fa, f)
}

/**
 * Maps the output of the layer using f
 */
export function map_<R, E, A, B>(fa: Layer<R, E, A>, f: (a: A) => B): Layer<R, E, B> {
  return new LayerMap(fa, f)
}

/**
 * Chains the output of the layer using f
 */
export function chain<R2, E2, A, B>(f: (a: A) => Layer<R2, E2, B>) {
  return <R, E>(fa: Layer<R, E, A>): Layer<R & R2, E | E2, B> => chain_(fa, f)
}

/**
 * Chains the output of the layer using f
 */
export function chain_<R, E, A, R2, E2, B>(
  fa: Layer<R, E, A>,
  f: (a: A) => Layer<R2, E2, B>
) {
  return new LayerChain(fa, f)
}

/**
 * Flatten `Layer< R, E, Layer< R2, E2, A>>`
 */
export function flatten<R, E, R2, E2, B>(
  ffa: Layer<R, E, Layer<R2, E2, B>>
): Layer<R & R2, E | E2, B> {
  return chain_(ffa, idFn)
}

/**
 * Creates a layer from a constructor (...deps) => T
 */
export function fromConstructor<S>(
  tag: Tag<S>
): <Services extends any[]>(
  constructor: (...services: Services) => S
) => (
  ...tags: { [k in keyof Services]: Tag<Services[k]> }
) => Layer<
  UnionToIntersection<
    { [k in keyof Services]: Has<Services[k]> }[keyof Services & number]
  >,
  never,
  Has<S>
> {
  return (f) => (...tags) =>
    fromEffect(tag)(
      T.accessServicesT(...tags)(((...services: any[]) =>
        f(...(services as any))) as any) as any
    )
}

/**
 * Creates a layer from a constructor (...deps) => Effect<R, E, T>
 */
export function fromConstructorM<S>(
  tag: Tag<S>
): <Services extends any[], R0, E0>(
  constructor: (...services: Services) => T.Effect<R0, E0, S>
) => (
  ...tags: { [k in keyof Services]: Tag<Services[k]> }
) => Layer<
  UnionToIntersection<
    { [k in keyof Services]: Has<Services[k]> }[keyof Services & number]
  > &
    R0,
  E0,
  Has<S>
> {
  return (f) => (...tags) =>
    fromEffect(tag)(
      T.accessServicesTM(...tags)(((...services: any[]) =>
        f(...(services as any))) as any) as any
    )
}

/**
 * Creates a layer from a constructor (...deps) => Managed<R, E, T>
 */
export function fromConstructorManaged<S>(
  tag: Tag<S>
): <Services extends any[], R0, E0>(
  constructor: (...services: Services) => M.Managed<R0, E0, S>
) => (
  ...tags: { [k in keyof Services]: Tag<Services[k]> }
) => Layer<
  UnionToIntersection<
    { [k in keyof Services]: Has<Services[k]> }[keyof Services & number]
  > &
    R0,
  E0,
  Has<S>
> {
  return (f) => (...tags) =>
    fromManaged(tag)(
      M.chain_(
        M.fromEffect(
          T.accessServicesT(...tags)((...services: any[]) => f(...(services as any)))
        ),
        idFn
      )
    )
}

/**
 * Creates a layer from a constructor (...deps) => T
 * with an open + release operation
 */
export function bracketConstructor<S>(
  tag: Tag<S>
): <Services extends any[], S2 extends S>(
  constructor: (...services: Services) => S2
) => (
  ...tags: { [k in keyof Services]: Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => T.Effect<R, E, unknown>,
  release: (s: S2) => T.Effect<R2, never, unknown>
) => Layer<
  UnionToIntersection<
    { [k in keyof Services]: Has<Services[k]> }[keyof Services & number]
  > &
    R &
    R2,
  E,
  Has<S>
> {
  return (f) => (...tags) => (open, release) =>
    prepare(tag)(
      T.accessServicesT(...tags)(((...services: any[]) =>
        f(...(services as any))) as any) as any
    )
      .open(open as any)
      .release(release as any) as any
}

/**
 * Creates a layer from a constructor (...deps) => T
 * with an open + release operation
 */
export function bracketConstructorM<S>(
  tag: Tag<S>
): <Services extends any[], S2 extends S, R0, E0>(
  constructor: (...services: Services) => T.Effect<R0, E0, S2>
) => (
  ...tags: { [k in keyof Services]: Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => T.Effect<R, E, unknown>,
  release: (s: S2) => T.Effect<R2, never, unknown>
) => Layer<
  UnionToIntersection<
    { [k in keyof Services]: Has<Services[k]> }[keyof Services & number]
  > &
    R &
    R2 &
    R0,
  E | E0,
  Has<S>
> {
  return (f) => (...tags) => (open, release) =>
    prepare(tag)(
      T.accessServicesTM(...tags)(((...services: any[]) =>
        f(...(services as any))) as any) as any
    )
      .open(open as any)
      .release(release as any) as any
}

export function restrict<Tags extends Tag<any>[]>(...ts: Tags) {
  return <R, E>(
    self: Layer<
      R,
      E,
      UnionToIntersection<
        {
          [k in keyof Tags]: [Tags[k]] extends [Tag<infer A>] ? Has<A> : never
        }[number]
      >
    >
  ): Layer<
    R,
    E,
    UnionToIntersection<
      {
        [k in keyof Tags]: [Tags[k]] extends [Tag<infer A>] ? Has<A> : never
      }[number]
    >
  > =>
    using_(
      self,
      fromRawEffect(
        T.accessServicesT(...ts)((...servises) =>
          servises
            .map((s, i) => ({ [ts[i].key]: s } as any))
            .reduce((x, y) => ({ ...x, ...y }))
        )
      )
    ) as any
}

/**
 * Builds this layer and uses it until it is interrupted. This is useful when
 * your entire application is a layer, such as an HTTP server.
 */
export function launch<R, E, A>(self: Layer<R, E, A>): T.Effect<R, E, never> {
  return M.useForever(build(self))
}

/**
 * Constructs a layer that passes along the specified environment as an
 * output.
 */
export function identity<R>() {
  return fromRawManaged(M.environment<R>())
}
