import * as A from "@effect-ts/core/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictIntersectionInterpreter = interpreter<StrictURI, IntersectionURI>()(
  () => ({
    _F: StrictURI,
    intersection: (...types) => (config) => (env) => {
      const stricts = types.map((getStrict) => getStrict(env).strict)

      return new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: (u) =>
              pipe(
                stricts,
                A.foreachF(T.Applicative)((d) => d.shrink(u)),
                T.map(A.reduce(({} as unknown) as any, (b, a) => ({ ...b, ...a })))
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
