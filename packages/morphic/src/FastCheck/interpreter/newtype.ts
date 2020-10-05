import type { Some } from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    newtypeIso: (iso, getArb, config) => (env) =>
      pipe(
        getArb(env).arb,
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.map(iso.get), env, { arb }))
      ),
    newtypePrism: (prism, getArb, config) => (env) =>
      pipe(
        getArb(env).arb,
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
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
