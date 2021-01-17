import * as E from "@effect-ts/core/Equal"
import { pipe } from "@effect-ts/core/Function"
import * as R from "@effect-ts/core/Record"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { mapRecord, projectFieldWithEnv2 } from "../../Utils"
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
    pipe(projectFieldWithEnv2(props, env), (eq) => {
      const equals = R.map_(eq, (e) => e.eq)
      return new EqType(
        eqApplyConfig(config?.conf)(E.struct(equals) as any, env, {
          eq: equals as any
        })
      ).setChilds(eq)
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (eq) => {
      const equals = R.map_(eq, (e) => e.eq)
      return asPartial(
        new EqType(
          eqApplyConfig(config?.conf)(
            E.struct(mapRecord(equals, eqOrUndefined)) as any,
            env,
            { eq: equals as any }
          )
        )
      ).setChilds(eq)
    }),
  both: (props, partial, config) => (env) =>
    pipe(
      [projectFieldWithEnv2(props, env), projectFieldWithEnv2(partial, env)] as const,
      ([eq, eqPartial]) => {
        const equals = R.map_(eq, (e) => e.eq)
        const equalsPartial = R.map_(eqPartial, (e) => e.eq)
        return new EqType(
          eqApplyConfig(config?.conf)(
            E.struct({ ...equals, ...mapRecord(equalsPartial, eqOrUndefined) }),
            env,
            {
              eq: equals as any,
              eqPartial: equalsPartial as any
            }
          )
        ).setChilds({ ...eq, ...eqPartial })
      }
    )
}))
