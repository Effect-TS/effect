import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqRecursiveInterpreter = interpreter<EqURI, RecursiveURI>()(() => ({
  _F: EqURI,
  recursive: (a, config) =>
    function f(env) {
      return new EqType(
        eqApplyConfig(config?.conf)(
          { equals: (y) => (x) => a(f)(env).eq.equals(y)(x) },
          env,
          {}
        )
      )
    }
}))
