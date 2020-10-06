import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<EqURI, Env> => ({
    _F: EqURI,
    recursive: <A>(
      a: (x: (env: Env) => EqType<A>) => (env: Env) => EqType<A>,
      config?: {
        name?: string
        config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new EqType(
          pipe(
            () => get()(env).eq,
            (getEq) =>
              eqApplyConfig(config?.config)({ equals: getEq().equals }, env, {})
          )
        )
      return res
    }
  })
)
