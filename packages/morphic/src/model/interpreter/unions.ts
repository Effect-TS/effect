import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraUnions2 } from "@matechs/morphic-alg/unions"

export const modelUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnions2<ModelURI, Env> => ({
    _F: ModelURI,
    union: <R, L, A>(
      items: Array<(_: R) => ModelType<L, A>>,
      name: string,
      config?: ConfigsForType<Env, L, A>
    ) => (env: R) =>
      new ModelType(
        modelApplyConfig(config)(
          M.union(items.map((x) => x(env).type) as any, name),
          env
        )
      )
  })
)
