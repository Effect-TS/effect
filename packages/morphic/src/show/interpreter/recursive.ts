import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Show } from "@matechs/core/Show"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive1,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

declare module "@matechs/morphic-alg/recursive" {
  interface RecursiveConfig<L, A> {
    [ShowURI]: {
      getShow: () => Show<A>
    }
  }
}

export const showRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<ShowURI, Env> => ({
    _F: ShowURI,
    recursive: <A>(
      a: (x: (env: Env) => ShowType<A>) => (env: Env) => ShowType<A>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        introduce(() => get()(env).show)(
          (getShow) =>
            new ShowType(
              showApplyConfig(config)({ show: (a) => getShow().show(a) }, env, {
                getShow
              })
            )
        )
      return res
    }
  })
)
