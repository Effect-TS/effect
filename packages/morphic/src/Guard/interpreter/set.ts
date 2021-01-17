import { pipe } from "@effect-ts/core/Function"
import { every_, Set } from "@effect-ts/core/Set"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"
import type { AOfGuard } from "./common"

export const guardSetInterpreter = interpreter<GuardURI, SetURI>()(() => ({
  _F: GuardURI,
  set: (a, _, config) => (env) =>
    pipe(
      a(env).guard,
      (guard) =>
        new GuardType(
          guardApplyConfig(config?.conf)(
            {
              is: (u): u is Set<AOfGuard<typeof guard>> =>
                u instanceof Set && every_(u, guard.is)
            },
            env,
            { guard }
          )
        )
    )
}))
