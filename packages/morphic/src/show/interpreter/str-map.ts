import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { getShow as RgetShow } from "@matechs/core/Record"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

export const showStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<ShowURI, Env> => ({
    _F: ShowURI,
    strMap: (codomain, config) => (env) =>
      new ShowType(showApplyConfig(config)(RgetShow(codomain(env).show), env))
  })
)
