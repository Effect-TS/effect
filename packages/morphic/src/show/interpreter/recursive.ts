import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive1,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

export const showRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<ShowURI, Env> => ({
    _F: ShowURI,
    recursive: <A>(
      a: (x: (env: Env) => ShowType<A>) => (env: Env) => ShowType<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        introduce(() => get()(env).show)(
          (getShow) =>
            new ShowType(
              showApplyConfig(config?.conf)({ show: (a) => getShow().show(a) }, env, {})
            )
        )
      return res
    }
  })
)
