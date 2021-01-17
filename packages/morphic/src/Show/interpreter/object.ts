import { pipe } from "@effect-ts/core/Function"
import * as S from "@effect-ts/core/Show"

import { mapRecord, projectFieldWithEnv } from "../..//Utils"
import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

const asPartial = <T>(x: ShowType<T>): ShowType<Partial<T>> => x as any

const showOrUndefined = <A>(s: S.Show<A>): S.Show<A | undefined> => ({
  show: (x) => (x == null ? "undefined" : s.show(x))
})

export const showObjectInterpreter = interpreter<ShowURI, ObjectURI>()(() => ({
  _F: ShowURI,
  interface: (props, config) => (env) =>
    new ShowType(
      pipe(projectFieldWithEnv(props, env)("show"), (show) =>
        showApplyConfig(config?.conf)(S.struct(show) as any, env, {
          show: show as any
        })
      )
    ),
  partial: (props, config) => (env) =>
    asPartial(
      new ShowType(
        pipe(projectFieldWithEnv(props, env)("show"), (show) =>
          showApplyConfig(config?.conf)(
            S.struct(mapRecord(show, showOrUndefined)) as any,
            env,
            {
              show: show as any
            }
          )
        )
      )
    ),
  both: (props, partial, config) => (env) =>
    new ShowType(
      pipe(projectFieldWithEnv(props, env)("show"), (show) =>
        pipe(projectFieldWithEnv(partial, env)("show"), (showPartial) =>
          showApplyConfig(config?.conf)(
            S.struct({
              ...show,
              ...mapRecord(showPartial, showOrUndefined)
            } as any),
            env,
            {
              show: show as any,
              showPartial: showPartial as any
            }
          )
        )
      )
    ) as any
}))
