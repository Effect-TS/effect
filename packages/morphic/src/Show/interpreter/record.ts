import { getShow as RgetShow } from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<ShowURI, Env> => ({
    _F: ShowURI,
    record: (codomain, config) => (env) =>
      pipe(
        codomain(env).show,
        (show) =>
          new ShowType(showApplyConfig(config?.conf)(RgetShow(show), env, { show }))
      )
  })
)
