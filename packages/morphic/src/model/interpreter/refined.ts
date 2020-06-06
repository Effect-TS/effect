import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as M from "@matechs/core/Model"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined2 } from "@matechs/morphic-alg/refined"

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [ModelURI]: {
      model: M.Type<A, E>
    }
  }
}

export const modelRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined2<ModelURI, Env> => ({
    _F: ModelURI,
    refined: (a, ref, name, config) => (env) =>
      introduce(a(env).type)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.refinement(model, ref, name), env, {
              model
            })
          )
      )
  })
)
