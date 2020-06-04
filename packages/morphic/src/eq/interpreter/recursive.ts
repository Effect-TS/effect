import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import type { MatechsAlgebraRecursive1 } from "@matechs/morphic-alg/recursive"

export const eqRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<EqURI, Env> => ({
    _F: EqURI,
    recursive: <A>(
      a: (x: (env: Env) => EqType<A>) => (env: Env) => EqType<A>,
      name: string,
      config?: ConfigsForType<Env, unknown, A>
    ) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new EqType(
          eqApplyConfig(config)({ equals: (a, b) => get()(env).eq.equals(a, b) }, env)
        )
      return res
    }
  })
)
