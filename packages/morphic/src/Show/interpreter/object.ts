import * as S from "@effect-ts/core/Classic/Show"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1 } from "../../Algebra/object"
import { mapRecord, memo, projectFieldWithEnv } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

const asPartial = <T>(x: ShowType<T>): ShowType<Partial<T>> => x as any

const showOrUndefined = <A>(s: S.Show<A>): S.Show<A | undefined> => ({
  show: (x) => (x == null ? "undefined" : s.show(x))
})

export const showObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<ShowURI, Env> => ({
    _F: ShowURI,
    interface: (props, config) => (env) =>
      new ShowType(
        pipe(projectFieldWithEnv(props, env)("show"), (show) =>
          showApplyConfig(config?.conf)(S.struct(show), env, {
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
  })
)
