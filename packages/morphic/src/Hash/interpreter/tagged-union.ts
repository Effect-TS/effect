import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashTaggedUnionInterpreter = interpreter<HashURI, TaggedUnionURI>()(
  () => ({
    _F: HashURI,
    taggedUnion: (tag, types, config) => (env) => {
      const hashs = mapRecord(types as any, (a) => a(env).hash)
      return new HashType(
        hashApplyConfig(config?.conf)(
          {
            hash: `Tagged(${tag})(${Object.keys(hashs)
              .map((t) => hashs[t].hash)
              .sort()
              .join(" | ")})`
          },
          env,
          {
            hashs: hashs as any
          }
        )
      )
    }
  })
)
