import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<StrictURI, Env> => ({
    _F: StrictURI,
    refined: (getStrict, _ref, config) => (env) =>
      pipe(
        getStrict(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: T.succeed
              },
              env,
              { strict }
            )
          )
      ),
    constrained: (getStrict, _ref, config) => (env) =>
      pipe(
        getStrict(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: T.succeed
              },
              env,
              { strict }
            )
          )
      )
  })
)
