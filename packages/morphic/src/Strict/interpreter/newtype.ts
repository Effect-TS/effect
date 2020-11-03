import { pipe } from "@effect-ts/core/Function"

import type { NewtypeURI } from "../../Algebra/Newtype"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictNewtypeInterpreter = interpreter<StrictURI, NewtypeURI>()(() => ({
  _F: StrictURI,
  newtypeIso: (_iso, getStrict, config) => (env) =>
    pipe(
      getStrict(env).strict,
      (strict) =>
        new StrictType(
          strictApplyConfig(config?.conf)(
            {
              shrink: strict.shrink as any
            },
            env,
            { strict }
          )
        )
    ),
  newtypePrism: (_prism, getStrict, config) => (env) =>
    pipe(
      getStrict(env).strict,
      (strict) =>
        new StrictType(
          strictApplyConfig(config?.conf)(
            {
              shrink: strict.shrink as any
            },
            env,
            { strict }
          )
        )
    )
}))
