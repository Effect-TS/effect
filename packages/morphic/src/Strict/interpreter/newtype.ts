import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<StrictURI, Env> => ({
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
  })
)
