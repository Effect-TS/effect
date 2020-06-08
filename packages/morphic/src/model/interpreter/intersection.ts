import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  IntersectionConfig,
  MatechsAlgebraIntersection2
} from "@matechs/morphic-alg/intersection"

export const modelIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection2<ModelURI, Env> => ({
    _F: ModelURI,
    intersection: <L, A>(
      items: Array<(_: Env) => ModelType<L, A>>,
      name: string,
      config?: ConfigsForType<Env, L, A, IntersectionConfig<L[], A[]>>
    ) => (env: Env) =>
      new ModelType(
        introduce(items.map((x) => x(env).codec))((models) =>
          modelApplyConfig(config)(M.intersection(models as any, name), env, {
            models: models as any
          })
        )
      )
  })
)
