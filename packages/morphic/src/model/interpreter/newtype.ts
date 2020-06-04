import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import type { MatechsAlgebraNewtype2 } from "@matechs/morphic-alg/newtype"

export const modelNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype2<ModelURI, Env> => ({
    _F: ModelURI,
    newtype: () => (a, config) => (env) =>
      new ModelType(modelApplyConfig(config)(a(env).type, env))
  })
)
