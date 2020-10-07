import * as R from "@effect-ts/core/Classic/Record"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<StrictURI, Env> => ({
    _F: StrictURI,
    record: (getCodomain, config) => (env) =>
      pipe(
        getCodomain(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: R.foreachF(T.Applicative)(strict.shrink)
              },
              env,
              { strict }
            )
          )
      )
  })
)
