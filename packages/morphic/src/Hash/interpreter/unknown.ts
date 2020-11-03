import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashUnknownInterpreter = interpreter<HashURI, UnknownURI>()(() => ({
  _F: HashURI,
  unknown: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        {
          hash: "unknown"
        },
        env,
        {}
      )
    )
}))
