import { reduce_ } from "../Array"
import * as C from "../Cause"
import * as T from "../Effect"
import * as E from "../Either"
import { identity as idFn, tuple } from "../Function"
import type { Has, Tag } from "../Has"
import { mergeEnvironments } from "../Has"
import * as M from "../Managed"
import type { Erase, UnionToIntersection } from "../Utils"
import type { Layer, MergeA, MergeE, MergeR } from "./definitions"
import {
  build,
  fold,
  from,
  fromRawEffect,
  fromRawFunction,
  fromRawFunctionM,
  LayerAllPar,
  LayerAllSeq,
  LayerChain,
  LayerFresh,
  LayerManaged,
  LayerMap,
  LayerSuspend,
  LayerZipWithSeq
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
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> {
  return new LayerZipWithSeq(self, that, tuple)
}

export function zip<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => zip_(left, right)
}

export function andSeq<R2, E2, A2>(that: Layer<R2, E2, A2>) {
  return <R, E, A>(self: Layer<R, E, A>) => andSeq_(self, that)
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
    from(self)(
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

/**
 * Empty layer, useful for init cases
 */
export const Empty: Layer<unknown, never, unknown> = new LayerSuspend(() =>
  identity<unknown>()
)

export type FromAll<
  Ls extends readonly Layer<any, any, any>[],
  R = unknown,
  E = never,
  A = unknown
> = ((...all: Ls) => any) extends (h: infer Head, ...t: infer Tail) => any
  ? Head extends Layer<infer _R, infer _E, infer _A>
    ? Tail extends readonly Layer<any, any, any>[]
      ? FromAll<Tail, _R & Erase<R, _A>, E | _E, _A & A>
      : Layer<_R & Erase<R, _A>, E | _E, A & _A>
    : Layer<R, E, A>
  : Layer<R, E, A>

export function fromAll<Ls extends readonly Layer<any, any, any>[]>(
  ...layers: Ls
): FromAll<Ls> {
  return reduce_(layers, Empty, (b, a) => b["<+<"](a) as any) as any
}

export type ToAll<
  Ls extends readonly Layer<any, any, any>[],
  R = unknown,
  E = never,
  A = unknown
> = ((...all: Ls) => any) extends (h: infer Head, ...t: infer Tail) => any
  ? Head extends Layer<infer _R, infer _E, infer _A>
    ? Tail extends readonly Layer<any, any, any>[]
      ? ToAll<Tail, Erase<_R, A> & R, E | _E, _A & A>
      : Layer<Erase<_R, A> & R, E | _E, A & _A>
    : Layer<R, E, A>
  : Layer<R, E, A>

export function toAll<Ls extends readonly Layer<any, any, any>[]>(
  ...layers: Ls
): ToAll<Ls> {
  return reduce_(layers, Empty, (b, a) => b[">+>"](a) as any) as any
}

export function catchAll<R1, E, E1, Out1>(handler: Layer<readonly [R1, E], E1, Out1>) {
  return <R, Out>(self: Layer<R, E, Out>): Layer<R & R1, E1, Out1 | Out> => {
    return fold(self)(
      fromRawFunctionM(([r, cause]: readonly [R1, C.Cause<E>]) =>
        E.fold_(
          C.failureOrCause(cause),
          (e) => T.succeed(tuple(r, e)),
          (c) => T.halt(c)
        )
      )[">>>"](handler)
    )(fromRawEffect(T.environment<Out>()))
  }
}

export function second<A>() {
  return fromRawFunction(([_, __]: readonly [unknown, A]) => __)
}

export function mapError<E, E1>(
  f: (e: E) => E1
): <R, Out>(self: Layer<R, E, Out>) => Layer<R, E1, Out> {
  return catchAll(fromRawFunctionM(([_, e]: readonly [unknown, E]) => T.fail(f(e))))
}
