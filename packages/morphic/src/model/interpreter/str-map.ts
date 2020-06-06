import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as M from "@matechs/core/Model"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraStrMap2 } from "@matechs/morphic-alg/str-map"

declare module "@matechs/morphic-alg/str-map" {
  interface StrMapConfig<L, A> {
    [ModelURI]: {
      model: M.Type<A, L>
    }
  }
}

export const modelStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap2<ModelURI, Env> => ({
    _F: ModelURI,
    strMap: (codomain, config) => (env) =>
      introduce(codomain(env).type)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.record(M.string, model), env, { model })
          )
      )
  })
)
