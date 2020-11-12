import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashUnionInterpreter = interpreter<HashURI, UnionURI>()(() => ({
  _F: HashURI,
  union: (...types) => (_, config) => (env) => {
    const hashes = types.map((a) => a(env).hash)
    return new HashType(
      hashApplyConfig(config?.conf)(
        {
          hash: `(${Object.keys(hashes)
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
}))
