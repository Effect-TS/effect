import { memo, projectFieldWithEnv, mapRecord } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as S from "@matechs/core/Show"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

const asPartial = <T>(x: ShowType<T>): ShowType<Partial<T>> => x as any

const showOrUndefined = <A>(s: S.Show<A>): S.Show<A | undefined> => ({
  show: (x) => (x == null ? "undefined" : s.show(x))
})

export const showObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<ShowURI, Env> => ({
    _F: ShowURI,
    interface: (props, config) => (env) =>
      new ShowType(
        introduce(projectFieldWithEnv(props, env)("show"))((show) =>
          showApplyConfig(config?.conf)(S.getStructShow(show), env, {
            show: show as any
          })
        )
      ),
    partial: (props, config) => (env) =>
      asPartial(
        new ShowType(
          introduce(projectFieldWithEnv(props, env)("show"))((show) =>
            showApplyConfig(config?.conf)(
              S.getStructShow(mapRecord(show, showOrUndefined)) as any,
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
        introduce(projectFieldWithEnv(props, env)("show"))((show) =>
          introduce(projectFieldWithEnv(partial, env)("show"))((showPartial) =>
            showApplyConfig(config?.conf)(
              S.getStructShow({
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
