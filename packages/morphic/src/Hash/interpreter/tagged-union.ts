import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashTaggedUnionInterpreter = interpreter<HashURI, TaggedUnionURI>()(
  () => ({
    _F: HashURI,
    taggedUnion: (tag, types, config) => (env) => {
      const hashes = mapRecord(types as any, (a) => a(env).hash)
      return new HashType(
        hashApplyConfig(config?.conf)(
          {
            hash: `Tagged(${tag})(${Object.keys(hashes)
              .map((t) => hashes[t].hash)
              .sort()
              .join(" | ")})`
          },
          env,
          {
            hashes: hashes as any
          }
        )
      )
    }
  })
)
