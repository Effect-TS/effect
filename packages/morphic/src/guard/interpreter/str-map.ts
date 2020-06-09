import { isString } from "util"

import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { AOfGuard, isUnknownRecord } from "./common"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraStrMap1 } from "@matechs/morphic-alg/str-map"

export const guardStrMapInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraStrMap1<GuardURI, Env> => ({
    _F: GuardURI,
    record: (getCodomain, config) => (env) =>
      introduce(getCodomain(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Readonly<Record<string, AOfGuard<typeof guard>>> =>
                  isUnknownRecord(u) &&
                  Object.keys(u).every((k) => isString(k) && guard.is(u[k]))
              },
              env,
              { guard }
            )
          )
      )
  })
)
