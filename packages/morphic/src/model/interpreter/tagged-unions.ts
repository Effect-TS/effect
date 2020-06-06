import type { TaggedUnionLA } from "../../config"
import { memo, collect } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as M from "@matechs/core/Model"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions2 } from "@matechs/morphic-alg/tagged-union"

declare module "@matechs/morphic-alg/tagged-union" {
  export interface TaggedUnionConfig<Types> {
    [ModelURI]: {
      models: TaggedUnionLA<Types, ModelURI>
    }
  }
}

export const modelTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions2<ModelURI, Env> => ({
    _F: ModelURI,
    taggedUnion: (_tag, dic, name, config) => (env) =>
      introduce(collect(dic, (_, getType) => getType(env).type))(
        (models) =>
          new ModelType(
            modelApplyConfig(config)(M.union(models as any, name), env, {
              models: models as any
            })
          )
      )
  })
)
