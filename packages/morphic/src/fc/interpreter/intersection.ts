import { genericTuple } from "fast-check"

import { IntersectionA } from "../../config"
import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraIntersection1,
  IntersectionConfig
} from "@matechs/morphic-alg/intersection"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [FastCheckURI]: {
      arbs: IntersectionA<A, FastCheckURI>
    }
  }
}

export const fcIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    intersection: <A>(
      items: ((env: Env) => FastCheckType<A>)[],
      _name: string,
      config?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
    ) => (env: Env) =>
      introduce(items.map((getArb) => getArb(env).arb))(
        (arbs) =>
          new FastCheckType(
            fcApplyConfig(config)(
              genericTuple(arbs).map((all) => Object.assign({}, ...all)),
              env,
              { arbs: arbs as any }
            )
          )
      )
  })
)
