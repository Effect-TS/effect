import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraIntersection2 } from "@matechs/morphic-alg/intersection"

export const modelIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection2<ModelURI, Env> => ({
    _F: ModelURI,
    intersection: <L, A>(
      items: Array<(_: Env) => ModelType<L, A>>,
      name: string,
      config?: ConfigsForType<Env, L, A>
    ) => (env: Env) =>
      new ModelType(
        modelApplyConfig(config)(
          M.intersection(items.map((x) => x(env).type) as any, name),
          env
        )
      )
  })
)
