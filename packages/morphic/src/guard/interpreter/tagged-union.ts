import { mapRecord, memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

export const guardTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<GuardURI, Env> => ({
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
