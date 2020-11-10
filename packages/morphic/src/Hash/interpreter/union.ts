import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashUnionInterpreter = interpreter<HashURI, UnionURI>()(() => ({
  _F: HashURI,
  union: (...types) => (_, config) => (env) => {
    const hashs = types.map((a) => a(env).hash)
    return new HashType(
      hashApplyConfig(config?.conf)(
        {
          hash: `(${Object.keys(hashs)
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
}))
