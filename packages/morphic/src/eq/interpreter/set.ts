import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import type { Array } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import type { Ord } from "@matechs/core/Ord"
import { getEq as SgetEq, Set } from "@matechs/core/Set"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet1, SetConfig } from "@matechs/morphic-alg/set"

export const eqSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<EqURI, Env> => ({
    _F: EqURI,
    set: <A>(
      a: (env: Env) => EqType<A>,
      _ord: Ord<A>,
      config?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
    ) => (env) =>
      introduce(a(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(SgetEq(eq), env, { eq }))
      )
  })
)
