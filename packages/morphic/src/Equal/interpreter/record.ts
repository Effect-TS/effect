import { getEqual as RgetEq } from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqRecordMapInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<EqURI, Env> => ({
    _F: EqURI,
    record: (getCodomain, config) => (env) =>
      pipe(
        getCodomain(env).eq,
        (eq) => new EqType(eqApplyConfig(config?.conf)(RgetEq(eq), env, { eq }))
      )
  })
)
