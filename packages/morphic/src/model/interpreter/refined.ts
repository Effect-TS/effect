import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined2 } from "@matechs/morphic-alg/refined"

export const modelRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined2<ModelURI, Env> => ({
    _F: ModelURI,
    refined: (a, ref, name, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.refinement(model, ref, name), env, {
              model
            })
          )
      )
  })
)
