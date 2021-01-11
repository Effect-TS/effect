import { getEqual as RgetEq } from "@effect-ts/core/Common/Record"
import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqRecordMapInterpreter = interpreter<EqURI, RecordURI>()(() => ({
  _F: EqURI,
  record: (getCodomain, config) => (env) =>
    pipe(
      getCodomain(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(RgetEq(eq), env, { eq }))
    )
}))
