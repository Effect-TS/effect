export const LayerTypeId = Symbol.for("@effect/core/Layer");
export type LayerTypeId = typeof LayerTypeId;

export const _RIn = Symbol.for("@effect/core/Layer/RIn");
export type _RIn = typeof _RIn;

export const _E = Symbol.for("@effect/core/Layer/E");
export type _E = typeof _E;

export const _ROut = Symbol.for("@effect/core/Layer/ROut");
export type _ROut = typeof _ROut;

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
 * @tsplus type ets/Layer
 */
export interface Layer<RIn, E, ROut> {
  readonly [_RIn]: (_: RIn) => void;
  readonly [_E]: () => E;
  readonly [_ROut]: () => ROut;

  readonly [LayerTypeId]: LayerTypeId;
}

/**
 * @tsplus type ets/Layer/Ops
 */
export interface LayerOps {
  $: LayerAspects;
}
export const Layer: LayerOps = {
  $: {}
};

/**
 * @tsplus type ets/Layer/Aspects
 */
export interface LayerAspects {}

export abstract class LayerAbstract<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
}

export type Instruction =
  | ILayerApply<any, any, any>
  | ILayerExtendScope<any, any, any>
  | ILayerFold<any, any, any, any, any, any, any, any, any>
  | ILayerFresh<any, any, any>
  | ILayerScoped<any, any, any>
  | ILayerSuspend<any, any, any>
  | ILayerTo<any, any, any, any, any>
  | ILayerZipWithPar<any, any, any, any, any, any, any>;

export class ILayerApply<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly _tag = "LayerApply";
  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(readonly self: Effect<RIn, E, Env<ROut>>) {}
}

export class ILayerExtendScope<RIn, E, ROut> implements Layer<RIn & Has<Scope>, E, ROut> {
  readonly _tag = "LayerExtendScope";
  readonly [_RIn]!: (_: RIn & Has<Scope>) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(readonly self: Layer<RIn, E, ROut>) {}
}

export class ILayerFold<RIn, E, ROut, RIn2, E2, ROut2, RIn3, E3, ROut3>
  implements Layer<RIn & RIn2 & RIn3, E2 | E3, ROut2 | ROut3>
{
  readonly _tag = "LayerFold";
  readonly [_RIn]!: (_: RIn & RIn2 & RIn3) => void;
  readonly [_E]!: () => E2 | E3;
  readonly [_ROut]!: () => ROut2 | ROut3;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly failure: (cause: Cause<E>) => Layer<RIn2, E2, ROut2>,
    readonly success: (r: Env<ROut>) => Layer<RIn3, E3, ROut3>
  ) {}
}

export class ILayerFresh<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly _tag = "LayerFresh";
  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(readonly self: Layer<RIn, E, ROut>) {}
}

export class ILayerScoped<RIn, E, ROut> extends LayerAbstract<RIn, E, ROut> {
  readonly _tag = "LayerScoped";

  constructor(readonly self: Effect<RIn & Has<Scope>, E, Env<ROut>>) {
    super();
  }
}

export class ILayerSuspend<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly _tag = "LayerSuspend";
  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E;
  readonly [_ROut]!: () => ROut;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(readonly self: () => Layer<RIn, E, ROut>) {}
}

export class ILayerTo<RIn, E, ROut, E1, ROut1> implements Layer<RIn, E | E1, ROut1> {
  readonly _tag = "LayerTo";
  readonly [_RIn]!: (_: RIn) => void;
  readonly [_E]!: () => E | E1;
  readonly [_ROut]!: () => ROut1;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
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
> implements Layer<RIn & RIn1, E | E1, ROut3> {
  readonly _tag = "LayerZipWithPar";
  readonly [_RIn]!: (_: RIn & RIn1) => void;
  readonly [_E]!: () => E | E1;
  readonly [_ROut]!: () => ROut3;
  readonly [LayerTypeId]: LayerTypeId = LayerTypeId;
  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (s: Env<ROut>, t: Env<ROut2>) => Env<ROut3>
  ) {}
}

/**
 * @tsplus macro identity
 */
export function instruction<R, E, A>(self: Layer<R, E, A>): Instruction {
  // @ts-expect-error
  return self;
}
