import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraRecursive2 } from "@matechs/morphic-alg/recursive"

export const modelRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive2<ModelURI, Env> => ({
    _F: ModelURI,
    recursive: <L, A>(
      lazyA: (x: (_: Env) => ModelType<L, A>) => (_: Env) => ModelType<L, A>,
      name: string,
      config?: ConfigsForType<Env, L, A>
    ) => (env: Env): ModelType<L, A> =>
      new ModelType(
        modelApplyConfig(config)(
          M.recursion(name, (Self) => lazyA((_) => new ModelType(Self))(env).type),
          env
        )
      )
  })
)
