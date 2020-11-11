import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictTaggedUnionInterpreter = interpreter<StrictURI, TaggedUnionURI>()(
  () => ({
    _F: StrictURI,
    taggedUnion: (tag, types, config) => (env) => {
      const stricts = mapRecord(types, (a) => a(env).strict)

      return new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: (u) => stricts[u[tag as any] as any].shrink(u)
          },
          env,
          {
            stricts: stricts as any
          }
        )
      )
    }
  })
)
