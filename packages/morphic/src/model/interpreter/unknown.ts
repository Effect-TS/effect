import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraUnknown2 } from "@matechs/morphic-alg/unknown"

export const modelUnknownInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnknown2<ModelURI, Env> => ({
    _F: ModelURI,
    unknown: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(M.withName(config?.name)(M.unknown), env, {})
      )
  })
)
