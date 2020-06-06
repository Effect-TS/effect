import type { IntersectionLA } from "../../config"
import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as M from "@matechs/core/Model"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraIntersection2,
  IntersectionConfig
} from "@matechs/morphic-alg/intersection"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [ModelURI]: {
      models: IntersectionLA<L, A, ModelURI>
    }
  }
}

export const modelIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection2<ModelURI, Env> => ({
    _F: ModelURI,
    intersection: <L, A>(
      items: Array<(_: Env) => ModelType<L, A>>,
      name: string,
      config?: ConfigsForType<Env, L, A, IntersectionConfig<L[], A[]>>
    ) => (env: Env) =>
      new ModelType(
        introduce(items.map((x) => x(env).type))((models) =>
          modelApplyConfig(config)(M.intersection(models as any, name), env, {
            models: models as any
          })
        )
      )
  })
)
