import * as R from "@effect-ts/core/Common/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderRecordInterpreter = interpreter<ReorderURI, RecordURI>()(() => ({
  _F: ReorderURI,
  record: (getCodomain, config) => (env) =>
    pipe(
      getCodomain(env).reorder,
      (reorder) =>
        new ReorderType(
          reorderApplyConfig(config?.conf)(
            {
              reorder: R.foreachF(T.Applicative)(reorder.reorder)
            },
            env,
            { reorder }
          )
        )
    )
}))
