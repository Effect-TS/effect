import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<StrictURI, Env> => ({
    _F: StrictURI,
    unknown: (cfg) => (env) =>
      new StrictType(
        strictApplyConfig(cfg?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      )
  })
)
