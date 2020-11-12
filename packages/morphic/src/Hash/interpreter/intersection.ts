import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashIntersectionInterpreter = interpreter<HashURI, IntersectionURI>()(
  () => ({
    _F: HashURI,
    intersection: (...types) => (config) => (env) => {
      const hashes = types.map((getHash) => getHash(env).hash)
      return new HashType(
        hashApplyConfig(config?.conf)(
          {
            hash: hashes
              .map((s) => s.hash)
              .sort()
              .join(" & ")
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
