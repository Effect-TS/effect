import { pipe } from "@effect-ts/core/Function"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashSetInterpreter = interpreter<HashURI, SetURI>()(() => ({
  _F: HashURI,
  set: (getHash, _ord, config) => (env) =>
    pipe(
      getHash(env).hash,
      (hash) =>
        new HashType(
          hashApplyConfig(config?.conf)(
            {
              hash: `Set<${hash.hash}>`
            },
            env,
            { hash }
          )
        )
    )
}))
