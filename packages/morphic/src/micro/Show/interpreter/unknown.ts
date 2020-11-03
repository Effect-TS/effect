import { pipe } from "@effect-ts/core/Function"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showUnknownInterpreter = interpreter<ShowURI, UnknownURI>()(() => ({
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
}))
