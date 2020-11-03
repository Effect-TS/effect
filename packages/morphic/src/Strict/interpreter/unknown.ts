import * as T from "@effect-ts/core/Sync"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictUnknownInterpreter = interpreter<StrictURI, UnknownURI>()(() => ({
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
}))
