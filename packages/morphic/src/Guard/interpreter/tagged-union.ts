import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { guardApplyConfig, GuardType, GuardURI } from "../base"

export const guardTaggedUnionInterpreter = interpreter<GuardURI, TaggedUnionURI>()(
  () => ({
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
