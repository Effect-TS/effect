import type { Refinement } from "@effect-ts/core/Function"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"
import type { AOfGuard } from "./common"

type BOfRefinement<X> = X extends Refinement<infer A, infer B> ? B : never

export const guardRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<GuardURI, Env> => ({
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
  })
)
