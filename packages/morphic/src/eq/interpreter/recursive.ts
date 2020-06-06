import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import type { Eq } from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive1,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

declare module "@matechs/morphic-alg/recursive" {
  interface RecursiveConfig<L, A> {
    [EqURI]: {
      getEq: () => Eq<A>
    }
  }
}

export const eqRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<EqURI, Env> => ({
    _F: EqURI,
    recursive: <A>(
      a: (x: (env: Env) => EqType<A>) => (env: Env) => EqType<A>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new EqType(
          introduce(() => get()(env).eq)((getEq) =>
            eqApplyConfig(config)({ equals: (a, b) => getEq().equals(a, b) }, env, {
              getEq
            })
          )
        )
      return res
    }
  })
)
