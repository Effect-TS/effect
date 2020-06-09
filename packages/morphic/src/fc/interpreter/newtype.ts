import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckURI, FastCheckType } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Some } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

export const fcNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    newtypeIso: (iso, getArb, config) => (env) =>
      introduce(getArb(env).arb)(
        (arb) =>
          new FastCheckType(fcApplyConfig(config?.conf)(arb.map(iso.get), env, { arb }))
      ),
    newtypePrism: (prism, getArb, config) => (env) =>
      introduce(getArb(env).arb)(
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
