import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { tuple, array as FCArray, string } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { array } from "@matechs/core/Array"
import { fromFoldable } from "@matechs/core/Record"
import { getFirstSemigroup } from "@matechs/core/Semigroup"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

const strmapFromArray = <A>() => fromFoldable(getFirstSemigroup<A>(), array)

export const fcStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    strMap: (codomain, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          FCArray(tuple(string(), codomain(env).arb)).map(strmapFromArray()),
          env
        )
      )
  })
)
