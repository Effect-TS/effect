import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    intersection: <A>(
      items: ((env: Env) => FastCheckType<A>)[],
      config?: {
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) =>
      pipe(
        items.map((getArb) => getArb(env).arb),
        (arbs) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env)
                .genericTuple(arbs)
                .map((all) => Object.assign({}, ...all)),
              env,
              { arbs: arbs as any }
            )
          )
      )
  })
)
