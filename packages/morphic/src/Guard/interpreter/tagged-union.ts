import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { mapRecord, memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

export const guardTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<GuardURI, Env> => ({
    _F: GuardURI,
    taggedUnion: (tag, types, config) => (env) => {
      const guards = mapRecord(types, (a) => a(env).guard)

      return new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is any =>
              typeof u === "object" &&
              u !== null &&
              tag in u &&
              (u as any)[tag] in guards &&
              guards[(u as any)[tag]].is(u)
          },
          env,
          {
            guards: guards as any
          }
        )
      )
    }
  })
)
