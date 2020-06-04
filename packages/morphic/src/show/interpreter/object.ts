import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo, projectFieldWithEnv } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { getStructShow } from "@matechs/core/Show"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

const asPartial = <T>(x: ShowType<T>): ShowType<Partial<T>> => x as any

export const showObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<ShowURI, Env> => ({
    _F: ShowURI,
    interface: (props, _name, config) => (env) =>
      new ShowType(
        showApplyConfig(config)(
          getStructShow(projectFieldWithEnv(props, env)("show")),
          env
        )
      ),
    partial: (props, _name, config) => (env) =>
      asPartial(
        new ShowType(
          showApplyConfig(config)(
            getStructShow(projectFieldWithEnv(props, env)("show")),
            env
          )
        )
      )
  })
)
