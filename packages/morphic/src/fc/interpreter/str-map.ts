import { memo } from "../../utils"
import { fcApplyConfig, accessFC } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { array } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import { fromFoldable } from "@matechs/core/Record"
import { getFirstSemigroup } from "@matechs/core/Semigroup"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

const strmapFromArray = <A>() => fromFoldable(getFirstSemigroup<A>(), array)

export const fcStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    record: (codomain, config) => (env) =>
      introduce(codomain(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env)
                .array(accessFC(env).tuple(accessFC(env).string(), arb))
                .map(strmapFromArray()),
              env,
              {
                arb
              }
            )
          )
      )
  })
)
