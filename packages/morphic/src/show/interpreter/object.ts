import type { InterfaceA } from "../../config"
import { memo, projectFieldWithEnv } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import * as S from "@matechs/core/Show"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

const asPartial = <T>(x: ShowType<T>): ShowType<Partial<T>> => x as any

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, S.URI>
    }
  }
  interface PartialConfig<Props> {
    [ShowURI]: {
      show: InterfaceA<Props, S.URI>
    }
  }
}

export const showObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<ShowURI, Env> => ({
    _F: ShowURI,
    interface: (props, _name, config) => (env) =>
      new ShowType(
        introduce(projectFieldWithEnv(props, env)("show"))((show) =>
          showApplyConfig(config)(S.getStructShow(show), env, {
            show: show as any
          })
        )
      ),
    partial: (props, _name, config) => (env) =>
      asPartial(
        new ShowType(
          introduce(projectFieldWithEnv(props, env)("show"))((show) =>
            showApplyConfig(config)(S.getStructShow(show), env, {
              show: show as any
            })
          )
        )
      )
  })
)
