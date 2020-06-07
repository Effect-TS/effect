import type { Arbitrary } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Some } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface CoerceConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

export const fcNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    newtype: () => (getArb, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) => new FastCheckType(fcApplyConfig(config)(arb, env, { arb }))
      ),
    coerce: () => (getArb, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) => new FastCheckType(fcApplyConfig(config)(arb as any, env, { arb }))
      ),
    iso: (getArb, iso, _name, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(fcApplyConfig(config)(arb.map(iso.get), env, { arb }))
      ),
    prism: (getArb, prism, _name, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(
              arb
                .filter((a) => prism.getOption(a)._tag === "Some")
                .map((a) => (prism.getOption(a) as Some<any>).value),
              env,
              { arb }
            )
          )
      )
  })
)
