import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Iso } from "@matechs/core/Monocle/Iso"
import type { Prism } from "@matechs/core/Monocle/Prism"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

type AOfIso<X> = X extends Iso<infer S, infer A> ? A : never
type AOfPrism<X> = X extends Prism<infer S, infer A> ? A : never

export const guardNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<GuardURI, Env> => ({
    _F: GuardURI,
    newtypeIso: (iso, getGuard, config) => (env) =>
      introduce(getGuard(env).guard)(
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
      introduce(getGuard(env).guard)(
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
