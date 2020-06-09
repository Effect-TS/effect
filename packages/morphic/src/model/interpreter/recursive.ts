import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive2,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

export const modelRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive2<ModelURI, Env> => ({
    _F: ModelURI,
    recursive: <L, A>(
      lazyA: (x: (_: Env) => ModelType<L, A>) => (_: Env) => ModelType<L, A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, L, A, RecursiveConfig<L, A>>
      }
    ) => (env: Env): ModelType<L, A> =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.recursion(
            config?.name || "Recursive",
            (Self) => lazyA((_) => new ModelType(Self))(env).codec
          ),
          env,
          {}
        )
      )
  })
)
