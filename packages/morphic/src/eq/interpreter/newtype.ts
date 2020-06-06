import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqURI, EqType } from "../hkt"

import type { Eq } from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [EqURI]: {
      eq: Eq<A>
      eqNewtype: Eq<N>
    }
  }
}

export const eqNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<EqURI, Env> => ({
    _F: EqURI,
    newtype: () => (getEq, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(eq, env, { eq, eqNewtype: eq }))
      )
  })
)
