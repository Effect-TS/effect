import { genericTuple } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraIntersection1,
  IntersectionConfig
} from "@matechs/morphic-alg/intersection"

export const fcIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    intersection: <A>(
      items: ((env: Env) => FastCheckType<A>)[],
      _name: string,
      config?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
    ) => (env: Env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          genericTuple(items.map((getArb) => getArb(env).arb)).map((all) =>
            Object.assign({}, ...all)
          ),
          env,
          {}
        )
      )
  })
)
