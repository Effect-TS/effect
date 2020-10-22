import * as A from "@effect-ts/core/Classic/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<StrictURI, Env> => ({
    _F: StrictURI,
    intersection: <A>(
      types: ((env: Env) => StrictType<A>)[],
      config?: {
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const stricts = types.map((getStrict) => getStrict(env).strict)

      return new StrictType<A>(
        strictApplyConfig(config?.conf)(
          {
            shrink: (u) =>
              pipe(
                stricts,
                A.foreachF(T.Applicative)((d) => d.shrink(u)),
                T.map(A.reduce(({} as unknown) as A, (b, a) => ({ ...b, ...a })))
              )
          },
          env,
          {
            stricts: stricts as any
          }
        )
      )
    }
  })
)
