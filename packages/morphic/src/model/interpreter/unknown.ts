import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraUnknown2 } from "@matechs/morphic-alg/unknown"

export const modelUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown2<ModelURI, Env> => ({
    _F: ModelURI,
    unknown: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.unknown, env))
  })
)
