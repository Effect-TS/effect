import type { Context } from "@fp-ts/data/Context"

/**
 * @category symbol
 * @since 1.0.0
 */
export const LayerTypeId = Symbol.for("@effect/core/Layer")

/**
 * @category symbol
 * @since 1.0.0
 */
export type LayerTypeId = typeof LayerTypeId

/**
 * A `Layer<RIn, E, ROut>` describes how to build one or more services in your
 * application. Services can be injected into effects via `Effect.provide`.
 * Effects can require services via `Effect.service`.
 *
 * Layer can be thought of as recipes for producing bundles of services, given
 * their dependencies (other services).
 *
 * Construction of services can be effectful and utilize resources that must be
 * acquired and safely released when the services are done being utilized.
 *
 * By default layers are shared, meaning that if the same layer is used twice
 * the layer will only be allocated a single time.
 *
 * Because of their excellent composition properties, layers are the idiomatic
 * way in Effect-TS to create services that depend on other services.
 *
 * @tsplus type effect/core/io/Layer
 * @category model
 * @since 1.0.0
 */
export interface Layer<RIn, E, ROut> {
  readonly [LayerTypeId]: {
    _RIn: (_: never) => RIn
    _E: (_: never) => E
    _ROut: (_: ROut) => void
  }
}

/**
 * @tsplus type effect/core/io/Layer.Ops
 * @category model
 * @since 1.0.0
 */
export interface LayerOps {
  $: LayerAspects
}
export const Layer: LayerOps = {
  $: {}
}

/**
 * @tsplus unify effect/core/io/Layer
 */
export function unifyLayer<X extends Layer<any, any, any>>(
  self: X
): Layer<
  [X] extends [{ [LayerTypeId]: { _RIn: (_: never) => infer RIn } }] ? RIn : never,
  [X] extends [{ [LayerTypeId]: { _E: (_: never) => infer E } }] ? E : never,
  [X] extends [{ [LayerTypeId]: { _ROut: (_: infer ROut) => void } }] ? ROut : never
> {
  return self
}

/**
 * @tsplus type effect/core/io/Layer.Aspects
 */
export interface LayerAspects {}

export type Instruction =
  | ILayerApply<any, any, any>
  | ILayerExtendScope<any, any, any>
  | ILayerFold<any, any, any, any, any, any, any, any, any>
  | ILayerFresh<any, any, any>
  | ILayerScoped<any, any, any>
  | ILayerSuspend<any, any, any>
  | ILayerTo<any, any, any, any, any>
  | ILayerZipWithPar<any, any, any, any, any, any, any>

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

export class ILayerApply<RIn, E, ROut> implements Layer<RIn, E, Context<ROut>> {
  readonly _tag = "LayerApply"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(readonly self: Effect<RIn, E, Context<ROut>>) {}
}

export class ILayerExtendScope<RIn, E, ROut> implements Layer<RIn | Scope, E, ROut> {
  readonly _tag = "LayerExtendScope"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(readonly self: Layer<RIn, E, ROut>) {}
}

export class ILayerFold<RIn, E, ROut, RIn2, E2, ROut2, RIn3, E3, ROut3>
  implements Layer<RIn | RIn2 | RIn3, E2 | E3, ROut2 | ROut3>
{
  readonly _tag = "LayerFold"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly failure: (cause: Cause<E>) => Layer<RIn2, E2, ROut2>,
    readonly success: (context: Context<ROut>) => Layer<RIn3, E3, ROut3>
  ) {}
}

export class ILayerFresh<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly _tag = "LayerFresh"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(readonly self: Layer<RIn, E, ROut>) {}
}

export class ILayerScoped<RIn, E, ROut> implements Layer<Exclude<RIn, Scope>, E, ROut> {
  readonly _tag = "LayerScoped"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(readonly self: Effect<RIn, E, Context<ROut>>) {}
}

export class ILayerSuspend<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly _tag = "LayerSuspend"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(readonly self: () => Layer<RIn, E, ROut>) {}
}

export class ILayerTo<RIn, E, ROut, E1, ROut1> implements Layer<RIn, E | E1, ROut1> {
  readonly _tag = "LayerTo"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<ROut, E1, ROut1>
  ) {}
}

export class ILayerZipWithPar<
  RIn,
  E,
  ROut,
  RIn1,
  E1,
  ROut2,
  ROut3
> implements Layer<RIn | RIn1, E | E1, ROut3> {
  readonly _tag = "LayerZipWithPar"
  readonly [LayerTypeId] = {
    _RIn: variance,
    _E: variance,
    _ROut: variance
  }
  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (left: Context<ROut>, right: Context<ROut2>) => Context<ROut3>
  ) {}
}

/**
 * @tsplus macro identity
 */
export function instruction<R, E, A>(self: Layer<R, E, A>): Instruction {
  // @ts-expect-error
  return self
}
