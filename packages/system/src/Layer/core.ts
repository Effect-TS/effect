import { reduce_ } from "../Array"
import type { Effect } from "../Effect"
import { readService } from "../Effect/has"
import type { DefaultEnv, Runtime } from "../Effect/runtime"
import { makeRuntime } from "../Effect/runtime"
import { identity, pipe, tuple } from "../Function"
import type { Has } from "../Has"
import { mergeEnvironments } from "../Has"
import type { Managed } from "../Managed/managed"
import type { Finalizer } from "../Managed/releaseMap"
import * as RM from "../RefM"
import type { Erase, UnionToIntersection } from "../Utils"
import * as T from "./deps"
import { Layer } from "./Layer"
import { HasMemoMap, MemoMap } from "./MemoMap"

export { Layer } from "./Layer"

export type AsyncR<R, A> = Layer<R, never, A>

export function pure<T>(has: T.Tag<T>) {
  return (resource: T) =>
    new Layer<unknown, never, T.Has<T>>(
      T.managedChain_(T.fromEffect(T.succeedNow(resource)), (a) =>
        environmentFor(has, a)
      )
    )
}

export function prepare<T>(has: T.Tag<T>) {
  return <R, E, A extends T>(acquire: T.Effect<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => T.Effect<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
        fromManaged(has)(
          T.managedChain_(
            T.makeExit_(acquire, (a) => release(a)),
            (a) => T.fromEffect(T.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => T.Effect<R2, never, any>) =>
      fromManaged(has)(T.makeExit_(acquire, (a) => release(a)))
  })
}

export function create<T>(has: T.Tag<T>) {
  return {
    fromEffect: fromEffect(has),
    fromManaged: fromManaged(has),
    pure: pure(has),
    prepare: prepare(has)
  }
}

export function fromEffect<T>(has: T.Tag<T>) {
  return <R, E>(resource: T.Effect<R, E, T>) =>
    new Layer<R, E, T.Has<T>>(
      T.managedChain_(T.fromEffect(resource), (a) => environmentFor(has, a))
    )
}

export function fromManaged<T>(has: T.Tag<T>) {
  return <R, E>(resource: T.Managed<R, E, T>) =>
    new Layer<R, E, T.Has<T>>(T.managedChain_(resource, (a) => environmentFor(has, a)))
}

export function fromFunction<B>(tag: T.Tag<B>) {
  return <A>(f: (a: A) => B) => fromEffect(tag)(T.access(f))
}

export function fromRawManaged<R, E, A>(resource: T.Managed<R, E, A>) {
  return new Layer<R, E, A>(resource)
}

export function fromRawEffect<R, E, A>(resource: T.Effect<R, E, A>) {
  return new Layer<R, E, A>(T.fromEffect(resource))
}

export function fromRawFunction<A, B>(f: (a: A) => B) {
  return fromRawEffect(T.access(f))
}

export function zip_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
) {
  return new Layer<R & R2, E | E2, readonly [A, A2]>(
    T.managedChain_(left.build, (l) =>
      T.managedChain_(right.build, (r) =>
        T.fromEffect(T.effectTotal(() => tuple(l, r)))
      )
    )
  )
}

export function zip<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => zip_(left, right)
}

export function merge_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
) {
  return new Layer<R & R2, E | E2, A & A2>(
    T.managedChain_(left.build, (l) =>
      T.managedChain_(right.build, (r) =>
        T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
      )
    )
  )
}

export function merge<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => merge_(left, right)
}

export function using<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => using_<R, E, A, R2, E2, A2>(left, right)
}

export function using_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
) {
  return new Layer<Erase<R, A2> & R2, E | E2, A & A2>(
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
}

export function consuming<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R & A2, E, A>) =>
    consuming_<R, E, A, R2, E2, A2>(left, right)
}

export function consuming_<R, E, A, R2, E2, A2>(
  left: Layer<R & A2, E, A>,
  right: Layer<R2, E2, A2>
) {
  return new Layer<R & R2, E | E2, A & A2>(
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
}

export function mergePar<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => mergePar_(left, right)
}

export function mergePar_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
) {
  return new Layer<R & R2, E | E2, A & A2>(
    T.managedChain_(
      T.managedZipWithPar_(left.build, right.build, (a, b) => [a, b] as const),
      ([l, r]) => T.fromEffect(T.effectTotal(() => ({ ...l, ...r })))
    )
  )
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

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new Layer(
    T.managedMap_(
      T.managedForeach_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )
}

export function allPar<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new Layer(
    T.managedMap_(
      T.foreachPar_(ls, (l) => l.build),
      (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
    )
  )
}

export function allParN(n: number) {
  return <Ls extends Layer<any, any, any>[]>(
    ...ls: Ls & { 0: Layer<any, any, any> }
  ): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> =>
    new Layer(
      T.managedMap_(
        T.foreachParN_(n)(ls, (l) => l.build),
        (ps) => reduce_(ps, {} as any, (b, a) => ({ ...b, ...a }))
      )
    )
}

function environmentFor<T>(has: T.Tag<T>, a: T): T.Managed<unknown, never, T.Has<T>>
function environmentFor<T>(has: T.Tag<T>, a: T): T.Managed<unknown, never, any> {
  return T.fromEffect(
    T.access((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<DefaultEnv, E, A>) {
  return layer
}

/**
 * Embed the requird environment in a region
 */
export function region<K, T>(h: T.Tag<T.Region<T, K>>) {
  return <R, E>(_: Layer<R, E, T>): Layer<R, E, T.Has<T.Region<T, K>>> =>
    pipe(
      fromRawEffect(T.access((r: T): T.Has<T.Region<T, K>> => ({ [h.key]: r } as any))),
      consuming(_)
    )
}

/**
 * Converts a layer to a managed runtime
 */
export function toRuntime<R, E, A>(_: Layer<R, E, A>): Managed<R, E, Runtime<A>> {
  return T.managedMap_(_.build, makeRuntime)
}

/**
 * A default memoMap is included in DefaultEnv,
 * this can be used to "scope" a portion of layers to use a different memo map
 */
export const memoMap = create(HasMemoMap).fromEffect(
  pipe(
    RM.makeRefM<
      ReadonlyMap<Layer<any, any, any>, readonly [T.IO<any, any>, Finalizer]>
    >(new Map()),
    T.map((ref) => new MemoMap(ref))
  )
)

/**
 * Memoize the current layer using a MemoMap
 */
export function memo<R, E, A>(layer: Layer<R, E, A>): Layer<T.Has<MemoMap> & R, E, A> {
  return pipe(
    T.fromEffect(readService(HasMemoMap)),
    T.managedChain((m) => m.getOrElseMemoize(layer)),
    fromRawManaged
  )
}

/**
 * Returns a fresh version of a potentially memoized layer,
 * note that this will override the memoMap for the layer and its children
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return pipe(layer, consuming(memoMap))
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
  return new Layer(T.managedMap_(fa.build, f))
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
  return new Layer(T.managedChain_(fa.build, (x) => f(x).build))
}

/**
 * Flatten `Layer< R, E, Layer< R2, E2, A>>`
 */
export function flatten<R, E, R2, E2, B>(
  ffa: Layer<R, E, Layer<R2, E2, B>>
): Layer<R & R2, E | E2, B> {
  return new Layer(T.managedChain_(ffa.build, (i) => i.build))
}

/**
 * Creates a layer from a constructor (...deps) => T
 */
export function fromConstructor<S>(
  tag: T.Tag<S>
): <Services extends any[]>(
  constructor: (...services: Services) => S
) => (
  ...tags: { [k in keyof Services]: T.Tag<Services[k]> }
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
  tag: T.Tag<S>
): <Services extends any[], R0, E0>(
  constructor: (...services: Services) => Effect<R0, E0, S>
) => (
  ...tags: { [k in keyof Services]: T.Tag<Services[k]> }
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
  tag: T.Tag<S>
): <Services extends any[], R0, E0>(
  constructor: (...services: Services) => Managed<R0, E0, S>
) => (
  ...tags: { [k in keyof Services]: T.Tag<Services[k]> }
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
      T.managedChain_(
        T.fromEffect(
          T.accessServicesT(...tags)((...services: any[]) => f(...(services as any)))
        ),
        identity
      )
    )
}

/**
 * Creates a layer from a constructor (...deps) => T
 * with an open + release operation
 */
export function bracketConstructor<S>(
  tag: T.Tag<S>
): <Services extends any[], S2 extends S>(
  constructor: (...services: Services) => S2
) => (
  ...tags: { [k in keyof Services]: T.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => Effect<R, E, unknown>,
  release: (s: S2) => Effect<R2, never, unknown>
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
  tag: T.Tag<S>
): <Services extends any[], S2 extends S, R0, E0>(
  constructor: (...services: Services) => Effect<R0, E0, S2>
) => (
  ...tags: { [k in keyof Services]: T.Tag<Services[k]> }
) => <R, R2, E>(
  open: (s: S2) => Effect<R, E, unknown>,
  release: (s: S2) => Effect<R2, never, unknown>
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

export function restrict<Tags extends T.Tag<any>[]>(...ts: Tags) {
  return <R, E>(
    self: Layer<
      R,
      E,
      UnionToIntersection<
        {
          [k in keyof Tags]: [Tags[k]] extends [T.Tag<infer A>] ? Has<A> : never
        }[number]
      >
    >
  ): Layer<
    R,
    E,
    UnionToIntersection<
      {
        [k in keyof Tags]: [Tags[k]] extends [T.Tag<infer A>] ? Has<A> : never
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
