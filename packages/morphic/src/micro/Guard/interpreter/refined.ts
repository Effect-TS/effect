import type { Refinement } from "@effect-ts/core/Function"
import { pipe } from "@effect-ts/core/Function"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"
import type { AOfGuard } from "./common"

type BOfRefinement<X> = X extends Refinement<infer A, infer B> ? B : never

export const guardRefinedInterpreter = interpreter<GuardURI, RefinedURI>()(() => ({
  _F: GuardURI,
  refined: (getGuard, ref, config) => (env) =>
    pipe(
      getGuard(env).guard,
      (guard) =>
        new GuardType(
          guardApplyConfig(config?.conf)(
            {
              is: (u): u is BOfRefinement<typeof ref> => guard.is(u) && ref(u)
            },
            env,
            { guard }
          )
        )
    ),
  constrained: (getGuard, ref, config) => (env) =>
    pipe(
      getGuard(env).guard,
      (guard) =>
        new GuardType(
          guardApplyConfig(config?.conf)(
            {
              is: (u): u is AOfGuard<typeof guard> => guard.is(u) && ref(u)
            },
            env,
            { guard }
          )
        )
    )
}))
