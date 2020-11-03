import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictRecordInterpreter = interpreter<StrictURI, RecordURI>()(() => ({
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
}))
