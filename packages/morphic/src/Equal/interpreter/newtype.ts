import { pipe } from "@effect-ts/core/Function"

import type { NewtypeURI } from "../../Algebra/Newtype"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqNewtypeInterpreter = interpreter<EqURI, NewtypeURI>()(() => ({
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
              equals: (y) => (x) => eq.equals(prism.reverseGet(y))(prism.reverseGet(x))
            },
            env,
            { eq }
          )
        )
    )
}))
