import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet2 } from "@matechs/morphic-alg/set"

declare module "@matechs/morphic-alg/set" {
  interface SetConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

export const modelSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet2<ModelURI, Env> => ({
    _F: ModelURI,
    set: (a, ord, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.setFromArray(model, ord), env, { model })
          )
      )
  })
)
