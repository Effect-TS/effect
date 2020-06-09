import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype2 } from "@matechs/morphic-alg/newtype"

export const modelNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype2<ModelURI, Env> => ({
    _F: ModelURI,
    newtypeIso: (iso, a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.iso(model, iso, config?.name), env, {
              model
            })
          )
      ),
    newtypePrism: (prism, a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.prism(model, prism, config?.name), env, {
              model
            })
          )
      )
  })
)
