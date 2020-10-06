import { all, fold } from "@effect-ts/core/Classic/Identity"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<EqURI, Env> => ({
    _F: EqURI,
    intersection: <A>(
      types: ((env: Env) => EqType<A>)[],
      config?: {
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const equals = types.map((getEq) => getEq(env).eq)
      return new EqType<A>(
        eqApplyConfig(config?.conf)(
          {
            equals: (b: A) => (a: A) => fold(all)(equals.map((eq) => eq.equals(b)(a)))
          },
          env,
          {
            equals: equals as any
          }
        )
      )
    }
  })
)
