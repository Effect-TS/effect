import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqUnionInterpreter = interpreter<EqURI, UnionURI>()(() => ({
  _F: EqURI,
  union: (...types) => (guards, config) => (env) => {
    const equals = types.map((a) => a(env).eq)

    return new EqType(
      eqApplyConfig(config?.conf)(
        {
          equals: (b) => (a): boolean => {
            if (a === b) {
              return true
            }
            for (const i in guards) {
              if (guards[i](a)._tag === "Some") {
                if (guards[i](b)._tag === "Some") {
                  return equals[i].equals(b)(a)
                }
              }
            }
            return false
          }
        },
        env,
        {
          equals: equals as any
        }
      )
    )
  }
}))
