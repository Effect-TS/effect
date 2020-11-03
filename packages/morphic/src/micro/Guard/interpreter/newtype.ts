import { pipe } from "@effect-ts/core/Function"
import type { Iso } from "@effect-ts/monocle/Iso"
import type { Prism } from "@effect-ts/monocle/Prism"

import type { NewtypeURI } from "../../Algebra/Newtype"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"

type AOfIso<X> = X extends Iso<infer S, infer A> ? A : never
type AOfPrism<X> = X extends Prism<infer S, infer A> ? A : never

export const guardNewtypeInterpreter = interpreter<GuardURI, NewtypeURI>()(() => ({
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
}))
