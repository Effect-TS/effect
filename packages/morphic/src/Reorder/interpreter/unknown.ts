import * as T from "@effect-ts/core/Sync"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderUnknownInterpreter = interpreter<ReorderURI, UnknownURI>()(() => ({
  _F: ReorderURI,
  unknown: (cfg) => (env) =>
    new ReorderType(
      reorderApplyConfig(cfg?.conf)(
        {
          reorder: T.succeed
        },
        env,
        {}
      )
    )
}))
