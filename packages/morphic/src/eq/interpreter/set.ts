import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { Array } from "@matechs/core/Array"
import { Ord } from "@matechs/core/Ord"
import { getEq as SgetEq, Set } from "@matechs/core/Set"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet1 } from "@matechs/morphic-alg/set"

export const eqSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<EqURI, Env> => ({
    _F: EqURI,
    set: <A>(
      a: (env: Env) => EqType<A>,
      _ord: Ord<A>,
      config?: ConfigsForType<Env, Array<unknown>, Set<A>>
    ) => (env) => new EqType(eqApplyConfig(config)(SgetEq(a(env).eq), env, {}))
  })
)
