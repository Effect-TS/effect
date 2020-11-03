import { pipe } from "@effect-ts/core/Function"

import type { NewtypeURI } from "../../Algebra/Newtype"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashNewtypeInterpreter = interpreter<HashURI, NewtypeURI>()(() => ({
  _F: HashURI,
  newtypeIso: (_, a, config) => (env) =>
    pipe(
      a(env).hash,
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
    ),
  newtypePrism: (_, a, config) => (env) =>
    pipe(
      a(env).hash,
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
