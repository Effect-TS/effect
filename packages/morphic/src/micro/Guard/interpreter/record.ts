import { pipe } from "@effect-ts/core/Function"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"
import type { AOfGuard } from "./common"
import { isUnknownRecord } from "./common"

export const guardRecordInterpreter = interpreter<GuardURI, RecordURI>()(() => ({
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
}))
