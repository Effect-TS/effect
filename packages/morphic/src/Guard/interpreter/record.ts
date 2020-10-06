import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"
import type { AOfGuard } from "./common"
import { isUnknownRecord } from "./common"

export const guardRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<GuardURI, Env> => ({
    _F: GuardURI,
    record: (getCodomain, config) => (env) =>
      pipe(
        getCodomain(env).guard,
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Readonly<Record<string, AOfGuard<typeof guard>>> =>
                  isUnknownRecord(u) &&
                  Object.keys(u).every((k) => typeof k === "string" && guard.is(u[k]))
              },
              env,
              { guard }
            )
          )
      )
  })
)
