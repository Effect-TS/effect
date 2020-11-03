import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashIntersectionInterpreter = interpreter<HashURI, IntersectionURI>()(
  () => ({
    _F: HashURI,
    intersection: (...types) => (config) => (env) => {
      const hashs = types.map((getHash) => getHash(env).hash)
      return new HashType(
        hashApplyConfig(config?.conf)(
          {
            hash: hashs.map((s) => s.hash).join(" & ")
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
