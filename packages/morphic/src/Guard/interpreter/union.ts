import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"

export const guardUnionInterpreter = interpreter<GuardURI, UnionURI>()(() => ({
  _F: GuardURI,
  union: (...types) => (_guards, config) => (env) => {
    const guards = types.map((a) => a(env).guard)

    return new GuardType(
      guardApplyConfig(config?.conf)(
        {
          is: (u): u is any => {
            for (const k in guards) {
              if (guards[k].is(u)) {
                return true
              }
            }
            return false
          }
        },
        env,
        {
          guards: guards as any
        }
      )
    )
  }
}))
