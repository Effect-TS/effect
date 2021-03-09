import * as C from "../Cause"
import * as CL from "../Clock"
import * as E from "../Either"
import { identity as idFn, pipe, tuple } from "../Function"
import type { Has, Tag } from "../Has"
import { mergeEnvironments } from "../Has"
import type * as SC from "../Schedule"
import type * as SCD from "../Schedule/Decision"
import type { UnionToIntersection } from "../Utils"
import type { Layer, MergeA, MergeE, MergeR } from "./definitions"
import {
  build,
  compose_,
  fold,
  fromRawEffect,
  fromRawFunction,
  fromRawFunctionM,
  fromRawManaged,
  identity,
  LayerAllPar,
  LayerAllSeq,
  LayerChain,
  LayerFresh,
  LayerManaged,
  LayerMap,
  LayerSuspend,
  LayerZipWithPar,
  LayerZipWithSeq
} from "./definitions"
import * as T from "./deps-effect"
import * as M from "./deps-managed"

export * from "./definitions"

function environmentFor<T>(has: Tag<T>, a: T): M.Managed<unknown, never, Has<T>>
function environmentFor<T>(has: Tag<T>, a: T): M.Managed<unknown, never, any> {
  return M.fromEffect(
    T.access((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  )
}

/**
 * Lazily constructs a layer. This is useful to avoid infinite recursion when
 * creating layers that refer to themselves.
 */
export function suspend<RIn, E, ROut>(
  f: () => Layer<RIn, E, ROut>
): Layer<RIn, E, ROut> {
  return new LayerSuspend(f)
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers combined
 * using the specified function.
 */
export function zipWithPar_<RIn, RIn1, E, E1, ROut, ROut1, ROut2>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn1, E1, ROut1>,
  f: (a: ROut, b: ROut1) => ROut2
): Layer<RIn & RIn1, E | E1, ROut2> {
  return new LayerZipWithPar(self, that, f)
}

/**
 * Constructs a layer that fails with the specified value.
 */
export function fail<E>(e: E): Layer<unknown, E, never> {
  return fromRawManaged(M.fail(e))
}

/**
 * Constructs a layer from the specified value.
 */
export function succeed<T>(resource: T): Layer<unknown, never, T> {
  return fromRawManaged(M.succeed(resource))
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers combined
 * using the specified function.
 */
export function zipWithPar<RIn1, E1, ROut, ROut1, ROut2>(
  that: Layer<RIn1, E1, ROut1>,
  f: (a: ROut, b: ROut1) => ROut2
) {
  return <RIn, E>(self: Layer<RIn, E, ROut>) => zipWithPar_(self, that, f)
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers combined
 * into a tuple.
 */
export function zipPar_<RIn, RIn1, E, E1, ROut, ROut1>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn1, E1, ROut1>
): Layer<RIn & RIn1, E | E1, readonly [ROut, ROut1]> {
  return zipWithPar_(self, that, (a, b) => [a, b] as const)
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs of both layers, and the outputs of both layers combined
 * into a tuple.
 */
export function zipPar<RIn, RIn1, E, E1, ROut, ROut1>(that: Layer<RIn1, E1, ROut1>) {
  return (self: Layer<RIn, E, ROut>) => zipPar_(self, that)
}

/**
 * Construct a service layer from a value
 */
export function pure<T>(has: Tag<T>) {
  return (resource: T): Layer<unknown, never, Has<T>> =>
    new LayerManaged(
      M.chain_(M.fromEffect(T.succeed(resource)), (a) => environmentFor(has, a))
    )
}

/**
 * DSL to construct service layers with acquire->open->release
 */
export function prepare<T>(has: Tag<T>) {
  return <R, E, A extends T>(acquire: T.Effect<R, E, A>) => ({
    open: <R1, E1, X>(open: (_: A) => T.Effect<R1, E1, X>) => ({
      release: <R2, Y>(release: (_: A) => T.Effect<R2, never, Y>) =>
        fromManaged(has)(
          M.chain_(
            M.makeExit_(acquire, (a) => release(a)),
            (a) => M.fromEffect(T.map_(open(a), () => a))
          )
        )
    }),
    release: <R2, X>(release: (_: A) => T.Effect<R2, never, X>) =>
      fromManaged(has)(M.makeExit_(acquire, (a) => release(a)))
  })
}

/**
 * Constructs a layer from the specified effect.
 */
export function fromEffect<T>(has: Tag<T>) {
  return <R, E>(resource: T.Effect<R, E, T>): Layer<R, E, Has<T>> =>
    new LayerManaged(M.chain_(M.fromEffect(resource), (a) => environmentFor(has, a)))
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(has: Tag<T>) {
  return <R, E>(resource: M.Managed<R, E, T>): Layer<R, E, Has<T>> =>
    new LayerManaged(M.chain_(resource, (a) => environmentFor(has, a)))
}

/**
 * Constructs a layer from the environment using the specified function.
 */
export function fromFunction<B>(tag: Tag<B>) {
  return <A>(f: (a: A) => B): Layer<A, never, Has<B>> => fromEffect(tag)(T.access(f))
}

/**
 * Zips layers together
 */
export function zip_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> {
  return new LayerZipWithSeq(self, that, tuple)
}

/**
 * Zips layers together
 */
export function zip<R2, E2, A2>(right: Layer<R2, E2, A2>) {
  return <R, E, A>(left: Layer<R, E, A>) => zip_(left, right)
}

/**
 * Merges layers sequentially
 */
export function andSeq<R2, E2, A2>(that: Layer<R2, E2, A2>) {
  return <R, E, A>(self: Layer<R, E, A>) => andSeq_(self, that)
}

/**
 * Merges layers sequentially
 */
export function andSeq_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  that: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerZipWithSeq(self, that, (l, r) => ({ ...l, ...r }))
}

/**
 * Merges all layers in parallel
 */
export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllPar(ls)
}

/**
 * Merges all layers sequentially
 */
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
export function toRuntime<R, E, A>(
  _: Layer<R, E, A>
): M.Managed<R, E, T.CustomRuntime<A, unknown>> {
  return M.chain_(build(_), (a) =>
    M.fromEffect(
      T.checkPlatform((platform) =>
        T.effectTotal(() => T.makeCustomRuntime(a, platform))
      )
    )
  )
}

/**
 * Creates a fresh version of this layer that will not be shared.
 */
export function fresh<R, E, A>(layer: Layer<R, E, A>): Layer<R, E, A> {
  return new LayerFresh(layer)
}

/**
 * Returns a new layer whose output is mapped by the specified function.
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

/**
 * Restrict output to only contain the specified services
 */
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
    compose_(
      self,
      fromRawEffect(
        T.accessServicesT(...ts)((...servises) =>
          servises
            .map((s, i) => ({ [ts[i]!.key]: s } as any))
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
 * Recovers from all errors.
 */
export function catchAll<R1, E, E1, Out1>(handler: Layer<readonly [R1, E], E1, Out1>) {
  return <R, Out>(self: Layer<R, E, Out>): Layer<R & R1, E1, Out1 | Out> => {
    return fold(self)(
      fromRawFunctionM(([r, cause]: readonly [R1, C.Cause<E>]) =>
        E.fold_(
          C.failureOrCause(cause),
          (e) => T.succeed(tuple(r, e)),
          (c) => T.halt(c)
        )
      )[">=>"](handler)
    )(fromRawEffect(T.environment<Out>()))
  }
}

/**
 * A layer that passes along the first element of a tuple.
 */
export function first<A>() {
  return fromRawFunction(([_, __]: readonly [A, unknown]) => _)
}

/**
 * A layer that passes along the second element of a tuple.
 */
export function second<A>() {
  return fromRawFunction(([_, __]: readonly [unknown, A]) => __)
}

/**
 * Returns a layer with its error channel mapped using the specified
 * function.
 */
export function mapError<E, E1>(
  f: (e: E) => E1
): <R, Out>(self: Layer<R, E, Out>) => Layer<R, E1, Out> {
  return catchAll(fromRawFunctionM(([_, e]: readonly [unknown, E]) => T.fail(f(e))))
}

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orDie<R, E, Out>(self: Layer<R, E, Out>): Layer<R, never, Out> {
  return catchAll(fromRawFunctionM(([_, e]: readonly [unknown, E]) => T.die(e)))(self)
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse<RIn1, E1, ROut1>(that: Layer<RIn1, E1, ROut1>) {
  return catchAll(first<RIn1>()[">=>"](that))
}

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry<RIn, RIn1, E, ROut>(
  self: Layer<RIn, E, ROut>,
  schedule: SC.Schedule<RIn1 & CL.HasClock, E, any>
): Layer<RIn1 & RIn & CL.HasClock, E, ROut> {
  type S = SCD.StepFunction<RIn & RIn1 & CL.HasClock, E, any>

  const loop = (): Layer<readonly [RIn & RIn1 & CL.HasClock, S], E, ROut> => {
    const update = fromRawFunctionM(
      ([[r, s], e]: readonly [readonly [RIn & RIn1 & CL.HasClock, S], E]) =>
        pipe(
          CL.currentTime,
          T.orDie,
          T.chain((now) =>
            pipe(
              T.chain_(s(now, e), (result) => {
                if (result._tag === "Done") {
                  return T.fail(e)
                } else {
                  return pipe(
                    CL.sleep(Math.abs(now - result.interval)),
                    T.as([r, result.next] as const)
                  )
                }
              })
            )
          ),
          T.provideAll(r)
        )
    )

    return pipe(
      first<RIn>()[">=>"](self),
      catchAll(update[">=>"](suspend(() => fresh(loop()))))
    )
  }

  return zipPar_(
    identity<RIn & RIn1 & CL.HasClock>(),
    fromRawEffect(T.succeed(schedule.step))
  )[">=>"](loop())
}
