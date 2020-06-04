import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { MatechsAlgebraUnknown1 } from "@matechs/morphic-alg/unknown"

export const showUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown1<ShowURI, Env> => ({
    _F: ShowURI,
    unknown: (config) => (env) =>
      new ShowType(showApplyConfig(config)({ show: (_any: any) => "<unknown>" }, env))
  })
)
