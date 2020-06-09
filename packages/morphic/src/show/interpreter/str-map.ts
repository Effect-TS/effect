import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import { getShow as RgetShow } from "@matechs/core/Record"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

export const showStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<ShowURI, Env> => ({
    _F: ShowURI,
    record: (codomain, config) => (env) =>
      introduce(codomain(env).show)(
        (show) =>
          new ShowType(showApplyConfig(config?.conf)(RgetShow(show), env, { show }))
      )
  })
)
