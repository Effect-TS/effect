import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const hashRecursiveInterpreter = interpreter<HashURI, RecursiveURI>()(() => ({
  _F: HashURI,
  recursive: (a, config) => {
    const get = memo(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env).hash,
        (getHash) =>
          new HashType(hashApplyConfig(config?.conf)({ hash: getHash().hash }, env, {}))
      )
    return res
  }
}))
