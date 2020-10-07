import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<ShowURI, Env> => ({
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
        pipe(
          () => get()(env).show,
          (getShow) =>
            new ShowType(
              showApplyConfig(config?.conf)({ show: (a) => getShow().show(a) }, env, {})
            )
        )
      return res
    }
  })
)
