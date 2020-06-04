import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { MatechsAlgebraRecursive1 } from "@matechs/morphic-alg/recursive"

export const showRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<ShowURI, Env> => ({
    _F: ShowURI,
    recursive: <A>(
      a: (x: (env: Env) => ShowType<A>) => (env: Env) => ShowType<A>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A>
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new ShowType(
          showApplyConfig(config)({ show: (a) => get()(env).show.show(a) }, env)
        )
      return res
    }
  })
)
