import type { Arbitrary } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
      arbNewtype: Arbitrary<N>
    }
  }
}

export const fcNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    newtype: () => (getArb, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(arb, env, { arb: arb as any, arbNewtype: arb })
          )
      )
  })
)
