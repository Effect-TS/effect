import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraRefined2 } from "@matechs/morphic-alg/refined"

export const modelRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined2<ModelURI, Env> => ({
    _F: ModelURI,
    refined: (a, ref, name, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.refinement(a(env).type, ref, name), env))
  })
)
