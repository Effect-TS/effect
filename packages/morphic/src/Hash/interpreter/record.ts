import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashRecordInterpreter = interpreter<HashURI, RecordURI>()(() => ({
  _F: HashURI,
  record: (codomain, config) => (env) =>
    pipe(
      codomain(env).hash,
      (hash) =>
        new HashType(
          hashApplyConfig(config?.conf)(
            {
              hash: `Record<string, ${hash.hash}>`
            },
            env,
            { hash }
          )
        )
    )
}))
