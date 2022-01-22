import type { Cause } from "../Cause/definition"
import { _E, _RIn, _ROut } from "../Effect/definition/commons"
import type { Managed } from "../Managed/definition"
import { AtomicReference } from "../Support/AtomicReference"

export const LayerHashSym = Symbol.for("@effect-ts/system/Layer")
export type LayerHashSym = typeof LayerHashSym

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
 * @ets type ets/Layer
 */
export interface Layer<RIn, E, ROut> {
  readonly [_RIn]: (_: RIn) => void
  readonly [_E]: () => E
  readonly [_ROut]: () => ROut

  readonly [LayerHashSym]: AtomicReference<PropertyKey>

  setKey(hash: PropertyKey): this
}

export abstract class LayerAbstract<RIn, E, ROut> implements Layer<RIn, E, ROut> {
  readonly [LayerHashSym] = new AtomicReference<PropertyKey>(Symbol());

  readonly [_RIn]: (_: RIn) => void;
  readonly [_E]: () => E;
  readonly [_ROut]: () => ROut

  /**
   * Set the hash key for memoization
   */
  setKey(hash: PropertyKey) {
    this[LayerHashSym].set(hash)
    return this
  }
}

export type Instruction =
  | ILayerFold<any, any, any, any, any, any, any, any, any>
  | ILayerFresh<any, any, any>
  | ILayerManaged<any, any, any>
  | ILayerSuspend<any, any, any>
  | ILayerTo<any, any, any, any, any>
  | ILayerZipWith<any, any, any, any, any, any, any>
  | ILayerZipWithPar<any, any, any, any, any, any, any>

export class ILayerFold<
  RIn,
  E,
  ROut,
  RIn2,
  E2,
  ROut2,
  RIn3,
  E3,
  ROut3
> extends LayerAbstract<RIn & RIn2 & RIn3, E2 | E3, ROut2 | ROut3> {
  readonly _tag = "LayerFold"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly failure: (cause: Cause<E>) => Layer<RIn2, E2, ROut2>,
    readonly success: (r: ROut) => Layer<RIn3, E3, ROut3>
  ) {
    super()
  }
}

export class ILayerFresh<RIn, E, ROut> extends LayerAbstract<RIn, E, ROut> {
  readonly _tag = "LayerFresh"

  constructor(readonly self: Layer<RIn, E, ROut>) {
    super()
  }
}

export class ILayerManaged<RIn, E, ROut> extends LayerAbstract<RIn, E, ROut> {
  readonly _tag = "LayerManaged"

  constructor(readonly self: Managed<RIn, E, ROut>) {
    super()
  }
}

export class ILayerSuspend<RIn, E, ROut> extends LayerAbstract<RIn, E, ROut> {
  readonly _tag = "LayerSuspend"

  constructor(readonly self: () => Layer<RIn, E, ROut>) {
    super()
  }
}

export class ILayerTo<RIn, E, ROut, E1, ROut1> extends LayerAbstract<
  RIn,
  E | E1,
  ROut1
> {
  readonly _tag = "LayerTo"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<ROut, E1, ROut1>
  ) {
    super()
  }
}

export class ILayerZipWith<RIn, E, ROut, RIn1, E1, ROut2, ROut3> extends LayerAbstract<
  RIn & RIn1,
  E | E1,
  ROut3
> {
  readonly _tag = "LayerZipWith"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (s: ROut, t: ROut2) => ROut3
  ) {
    super()
  }
}

export class ILayerZipWithPar<
  RIn,
  E,
  ROut,
  RIn1,
  E1,
  ROut2,
  ROut3
> extends LayerAbstract<RIn & RIn1, E | E1, ROut3> {
  readonly _tag = "LayerZipWithPar"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<RIn1, E1, ROut2>,
    readonly f: (s: ROut, t: ROut2) => ROut3
  ) {
    super()
  }
}

/**
 * @ets_optimize identity
 */
export function instruction<R, E, A>(self: Layer<R, E, A>): Instruction {
  // @ts-expect-error
  return self
}
