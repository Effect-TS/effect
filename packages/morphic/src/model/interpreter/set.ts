import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraSet2 } from "@matechs/morphic-alg/set"

export const modelSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet2<ModelURI, Env> => ({
    _F: ModelURI,
    set: (a, ord, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.setFromArray(a(env).type, ord), env))
  })
)
