import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictSetInterpreter = interpreter<StrictURI, SetURI>()(() => ({
  _F: StrictURI,
  set: (a, _, config) => (env) =>
    pipe(
      a(env).strict,
      (strict) =>
        new StrictType(
          strictApplyConfig(config?.conf)(
            {
              shrink: T.succeed
            },
            env,
            { strict }
          )
        )
    )
}))
