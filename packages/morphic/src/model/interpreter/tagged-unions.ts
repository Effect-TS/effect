import { memo, collect } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions2 } from "@matechs/morphic-alg/tagged-union"

export const modelTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions2<ModelURI, Env> => ({
    _F: ModelURI,
    taggedUnion: (_tag, dic, config) => (env) =>
      introduce(collect(dic, (_, getType) => getType(env).codec))(
        (models) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.union(models as any, config?.name), env, {
              models: models as any
            })
          )
      )
  })
)
