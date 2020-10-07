import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<StrictURI, Env> => ({
    _F: StrictURI,
    recursive: <A>(
      a: (x: (env: Env) => StrictType<A>) => (env: Env) => StrictType<A>,
      config?: {
        name?: string
        config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new StrictType(
          pipe(
            () => get()(env).strict,
            (getStrict) =>
              strictApplyConfig(config?.config)(
                {
                  shrink: (u) => getStrict().shrink(u)
                },
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
