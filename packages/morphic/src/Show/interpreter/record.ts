import { getShow as RgetShow } from "@effect-ts/core/Common/Record"
import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showRecordInterpreter = interpreter<ShowURI, RecordURI>()(() => ({
  _F: ShowURI,
  record: (codomain, config) => (env) =>
    pipe(
      codomain(env).show,
      (show) =>
        new ShowType(showApplyConfig(config?.conf)(RgetShow(show), env, { show }))
    )
}))
