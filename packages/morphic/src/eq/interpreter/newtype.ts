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
    }
  }
  interface CoerceConfig<L, A, N> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
  interface IsoConfig<L, A, N> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
}

export const eqNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<EqURI, Env> => ({
    _F: EqURI,
    newtype: () => (getEq, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(eq as any, env, { eq }))
      ),
    coerce: () => (getEq, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(eq as any, env, { eq }))
      ),
    iso: (getEq, iso, _name, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) =>
          new EqType(
            eqApplyConfig(config)(
              {
                equals: (x, y) => eq.equals(iso.reverseGet(x), iso.reverseGet(y))
              },
              env,
              { eq }
            )
          )
      ),
    prism: (getEq, prism, _name, config) => (env) =>
      introduce(getEq(env).eq)(
        (eq) =>
          new EqType(
            eqApplyConfig(config)(
              {
                equals: (x, y) => eq.equals(prism.reverseGet(x), prism.reverseGet(y))
              },
              env,
              { eq }
            )
          )
      )
  })
)
