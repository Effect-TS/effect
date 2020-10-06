import { pipe } from "@effect-ts/core/Function"
import type { Iso } from "@effect-ts/monocle/Iso"
import type { Prism } from "@effect-ts/monocle/Prism"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

type AOfIso<X> = X extends Iso<infer S, infer A> ? A : never
type AOfPrism<X> = X extends Prism<infer S, infer A> ? A : never

export const guardNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<GuardURI, Env> => ({
    _F: GuardURI,
    newtypeIso: (iso, getGuard, config) => (env) =>
      pipe(
        getGuard(env).guard,
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is AOfIso<typeof iso> => guard.is(u)
              },
              env,
              { guard }
            )
          )
      ),
    newtypePrism: (prism, getGuard, config) => (env) =>
      pipe(
        getGuard(env).guard,
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is AOfPrism<typeof prism> =>
                  guard.is(u) && prism.getOption(u)._tag === "Some"
              },
              env,
              { guard }
            )
          )
      )
  })
)
