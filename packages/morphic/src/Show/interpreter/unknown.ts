import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<ShowURI, Env> => ({
    _F: ShowURI,
    unknown: (config) => (env) =>
      new ShowType(
        pipe(
          {
            show: (_any: any) => config?.name || "<unknown>"
          },
          (show) => showApplyConfig(config?.conf)(show, env, {})
        )
      )
  })
)
