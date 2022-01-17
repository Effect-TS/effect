// ets_tracing: off

import type { Cause } from "../../Cause/definition"
import type { Managed } from "../../Managed/definition"
import { Layer } from "./base"

export type Instruction =
  | ILayerFold<any, any, any, any, any, any, any, any, any>
  | ILayerFresh<any, any, any>
  | ILayerManaged<any, any, any>
  | ILayerSuspend<any, any, any>
  | ILayerTo<any, any, any, any, any>
  | ILayerZipWith<any, any, any, any, any, any, any>
  | ILayerZipWithPar<any, any, any, any, any, any, any>

export class ILayerFold<RIn, E, ROut, RIn2, E2, ROut2, RIn3, E3, ROut3> extends Layer<
  RIn & RIn2 & RIn3,
  E2 | E3,
  ROut2 | ROut3
> {
  readonly _tag = "LayerFold"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly failure: (cause: Cause<E>) => Layer<RIn2, E2, ROut2>,
    readonly success: (r: ROut) => Layer<RIn3, E3, ROut3>
  ) {
    super()
  }
}

export class ILayerFresh<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerFresh"

  constructor(readonly self: Layer<RIn, E, ROut>) {
    super()
  }
}

export class ILayerManaged<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerManaged"

  constructor(readonly self: Managed<RIn, E, ROut>) {
    super()
  }
}

export class ILayerSuspend<RIn, E, ROut> extends Layer<RIn, E, ROut> {
  readonly _tag = "LayerSuspend"

  constructor(readonly self: () => Layer<RIn, E, ROut>) {
    super()
  }
}

export class ILayerTo<RIn, E, ROut, E1, ROut1> extends Layer<RIn, E | E1, ROut1> {
  readonly _tag = "LayerTo"

  constructor(
    readonly self: Layer<RIn, E, ROut>,
    readonly that: Layer<ROut, E1, ROut1>
  ) {
    super()
  }
}

export class ILayerZipWith<RIn, E, ROut, RIn1, E1, ROut2, ROut3> extends Layer<
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

export class ILayerZipWithPar<RIn, E, ROut, RIn1, E1, ROut2, ROut3> extends Layer<
  RIn & RIn1,
  E | E1,
  ROut3
> {
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
