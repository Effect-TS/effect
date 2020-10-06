import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<EqURI, Env> => ({
    _F: EqURI,
    newtypeIso: (iso, getEq, config) => (env) =>
      pipe(
        getEq(env).eq,
        (eq) =>
          new EqType(
            eqApplyConfig(config?.conf)(
              {
                equals: (y) => (x) => eq.equals(iso.reverseGet(y))(iso.reverseGet(x))
              },
              env,
              { eq }
            )
          )
      ),
    newtypePrism: (prism, getEq, config) => (env) =>
      pipe(
        getEq(env).eq,
        (eq) =>
          new EqType(
            eqApplyConfig(config?.conf)(
              {
                equals: (y) => (x) =>
                  eq.equals(prism.reverseGet(y))(prism.reverseGet(x))
              },
              env,
              { eq }
            )
          )
      )
  })
)
