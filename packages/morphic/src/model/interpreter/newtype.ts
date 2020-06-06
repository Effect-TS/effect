import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as M from "@matechs/core/Model"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype2 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [ModelURI]: {
      model: M.Type<A, L>
      modelNewtype: M.Type<N, L>
    }
  }
}

export const modelNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype2<ModelURI, Env> => ({
    _F: ModelURI,
    newtype: () => (a, config) => (env) =>
      introduce(a(env).type)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(model, env, {
              model: model as any,
              modelNewtype: model
            })
          )
      )
  })
)
