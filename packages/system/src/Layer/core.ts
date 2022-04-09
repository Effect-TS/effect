// ets_tracing: off

import * as C from "../Cause/index.js"
import * as CL from "../Clock/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { identity as idFn, pipe } from "../Function/index.js"
import type { Has, Tag } from "../Has/index.js"
import type * as SCD from "../Schedule/Decision/index.js"
import type * as SC from "../Schedule/index.js"
import type { UnionToIntersection } from "../Utils/index.js"
import type { Layer, MergeA, MergeE, MergeR } from "./definitions.js"
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
} from "./definitions.js"
import * as T from "./deps-effect.js"
import * as M from "./deps-managed.js"

export * from "./definitions.js"

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
): Layer<RIn & RIn1, E | E1, Tp.Tuple<[ROut, ROut1]>> {
  return zipWithPar_(self, that, Tp.tuple)
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
export function fromValue<T>(has: Tag<T>) {
  return (resource: T): Layer<unknown, never, Has<T>> =>
    new LayerManaged(M.fromEffect(T.succeed(has.has(resource)))).setKey(has.key)
}

/**
 * Constructs a layer from the specified effect.
 *
 * @ets_data_first fromEffect_
 */
export function fromEffect<T>(has: Tag<T>) {
  return <R, E>(resource: T.Effect<R, E, T>): Layer<R, E, Has<T>> =>
    fromEffect_(resource, has)
}

/**
 * Constructs a layer from the specified effect.
 */
export function fromEffect_<R, E, T>(
  resource: T.Effect<R, E, T>,
  has: Tag<T>
): Layer<R, E, Has<T>> {
  return new LayerManaged(M.map_(M.fromEffect(resource), has.has)).setKey(has.key)
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(has: Tag<T>) {
  return <R, E>(resource: M.Managed<R, E, T>): Layer<R, E, Has<T>> =>
    new LayerManaged(M.map_(resource, has.has)).setKey(has.key)
}

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged_<R, E, T>(
  resource: M.Managed<R, E, T>,
  has: Tag<T>
): Layer<R, E, Has<T>> {
  return new LayerManaged(M.map_(resource, has.has)).setKey(has.key)
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
): Layer<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return new LayerZipWithSeq(self, that, Tp.tuple)
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
        T.succeedWith(() => T.makeCustomRuntime(a, platform))
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
export function catchAll<R1, E, E1, Out1>(handler: Layer<Tp.Tuple<[R1, E]>, E1, Out1>) {
  return <R, Out>(self: Layer<R, E, Out>): Layer<R & R1, E1, Out1 | Out> => {
    return fold(self)(
      fromRawFunctionM(({ tuple: [r, cause] }: Tp.Tuple<[R1, C.Cause<E>]>) =>
        E.fold_(
          C.failureOrCause(cause),
          (e) => T.succeed(Tp.tuple(r, e)),
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
  return fromRawFunction((_: Tp.Tuple<[A, unknown]>) => _.get(0))
}

/**
 * A layer that passes along the second element of a tuple.
 */
export function second<A>() {
  return fromRawFunction((_: Tp.Tuple<[unknown, A]>) => _.get(1))
}

/**
 * Returns a layer with its error channel mapped using the specified
 * function.
 */
export function mapError<E, E1>(
  f: (e: E) => E1
): <R, Out>(self: Layer<R, E, Out>) => Layer<R, E1, Out> {
  return catchAll(fromRawFunctionM((_: Tp.Tuple<[unknown, E]>) => T.fail(f(_.get(1)))))
}

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orDie<R, E, Out>(self: Layer<R, E, Out>): Layer<R, never, Out> {
  return catchAll(fromRawFunctionM((_: Tp.Tuple<[unknown, E]>) => T.die(_.get(1))))(
    self
  )
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse<RIn1, E1, ROut1>(that: Layer<RIn1, E1, ROut1>) {
  return catchAll(first<RIn1>()[">=>"](that))
}

function retryLoop<RIn, RIn1, E, ROut>(
  self: Layer<RIn, E, ROut>
): Layer<
  Tp.Tuple<
    [RIn & RIn1 & CL.HasClock, SCD.StepFunction<RIn & RIn1 & CL.HasClock, E, any>]
  >,
  E,
  ROut
> {
  const update = fromRawFunctionM(
    ({
      tuple: [
        {
          tuple: [r, s]
        },
        e
      ]
    }: Tp.Tuple<
      [
        Tp.Tuple<
          [RIn & RIn1 & CL.HasClock, SCD.StepFunction<RIn & RIn1 & CL.HasClock, E, any>]
        >,
        E
      ]
    >) =>
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
                  T.as(Tp.tuple(r, result.next))
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
    catchAll(update[">=>"](suspend(() => fresh(retryLoop(self)))))
  )
}

/**
 * Retries constructing this layer according to the specified schedule.
 */
export function retry<RIn, RIn1, E, ROut>(
  self: Layer<RIn, E, ROut>,
  schedule: SC.Schedule<RIn1 & CL.HasClock, E, any>
): Layer<RIn1 & RIn & CL.HasClock, E, ROut> {
  return zipPar_(
    identity<RIn & RIn1 & CL.HasClock>(),
    fromRawEffect(T.succeed(schedule.step))
  )[">=>"](retryLoop<RIn, RIn1, E, ROut>(self))
}
