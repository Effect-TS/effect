import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo, collect } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraTaggedUnions2 } from "@matechs/morphic-alg/tagged-union"

export const modelTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions2<ModelURI, Env> => ({
    _F: ModelURI,
    taggedUnion: (_tag, dic, name, config) => (env) =>
      new ModelType(
        modelApplyConfig(config)(
          M.union(collect(dic, (_, getType) => getType(env).type) as any, name),
          env
        )
      )
  })
)
