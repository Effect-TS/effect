import { pipe } from "@effect-ts/core/Function"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashRefinedInterpreter = interpreter<HashURI, RefinedURI>()(() => ({
  _F: HashURI,
  refined: (getHash, _ref, config) => (env) =>
    pipe(
      getHash(env).hash,
      (hash) =>
        new HashType(
          hashApplyConfig(config?.conf)(
            {
              hash: config?.name ? `<${config.name}>(${hash.hash})` : hash.hash
            },
            env,
            {
              hash,
              hashRefined: hash
            }
          )
        )
    ),
  constrained: (getHash, _ref, config) => (env) =>
    pipe(
      getHash(env).hash,
      (hash) =>
        new HashType(
          hashApplyConfig(config?.conf)(
            {
              hash: config?.name ? `<${config.name}>(${hash.hash})` : hash.hash
            },
            env,
            {
              hash
            }
          )
        )
    )
}))
