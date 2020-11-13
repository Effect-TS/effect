import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderSetInterpreter = interpreter<ReorderURI, SetURI>()(() => ({
  _F: ReorderURI,
  set: (a, _, config) => (env) =>
    pipe(
      a(env).reorder,
      (reorder) =>
        new ReorderType(
          reorderApplyConfig(config?.conf)(
            {
              reorder: T.succeed
            },
            env,
            { reorder }
          )
        )
    )
}))
