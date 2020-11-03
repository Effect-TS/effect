import * as E from "@effect-ts/core/Classic/Equal"
import { pipe } from "@effect-ts/core/Function"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { mapRecord, projectFieldWithEnv } from "../../Utils"
import { eqApplyConfig, EqType, EqURI } from "../base"

const asPartial = <T>(x: EqType<T>): EqType<Partial<T>> => x as any

export const eqOrUndefined = <A>(eq: E.Equal<A>): E.Equal<A | undefined> => ({
  equals: (y) => (x) =>
    typeof x === "undefined" && typeof y === "undefined"
      ? true
      : typeof x === "undefined"
      ? false
      : typeof y === "undefined"
      ? false
      : eq.equals(y)(x)
})

export const eqObjectInterpreter = interpreter<EqURI, ObjectURI>()(() => ({
  _F: EqURI,
  interface: (props, config) => (env) =>
    new EqType(
      pipe(projectFieldWithEnv(props as any, env)("eq"), (eq) =>
        eqApplyConfig(config?.conf)(E.struct(eq), env, { eq: eq as any })
      )
    ),
  partial: (props, config) => (env) =>
    asPartial(
      new EqType(
        pipe(projectFieldWithEnv(props as any, env)("eq"), (eq) =>
          eqApplyConfig(config?.conf)(
            E.struct(mapRecord(eq, eqOrUndefined)) as any,
            env,
            { eq: eq as any }
          )
        )
      )
    ),
  both: (props, partial, config) => (env) =>
    new EqType(
      pipe(projectFieldWithEnv(props as any, env)("eq"), (eq) =>
        pipe(projectFieldWithEnv(partial as any, env)("eq"), (eqPartial) =>
          eqApplyConfig(config?.conf)(
            E.struct({ ...eq, ...mapRecord(eqPartial, eqOrUndefined) } as any),
            env,
            {
              eq: eq as any,
              eqPartial: eqPartial as any
            }
          )
        )
      )
    ) as any
}))
