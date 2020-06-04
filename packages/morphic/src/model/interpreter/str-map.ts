import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { memo } from "@morphic-ts/common/lib/utils"

import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraStrMap2 } from "@matechs/morphic-alg/str-map"

export const modelStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap2<ModelURI, Env> => ({
    _F: ModelURI,
    strMap: (codomain, config) => (env) =>
      new ModelType(
        modelApplyConfig(config)(M.record(M.string, codomain(env).type), env)
      )
  })
)
