import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Show } from "@matechs/core/Show"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

declare module "@matechs/morphic-alg/refined" {
  interface RefinedConfig<E, A, B> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

export const showRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<ShowURI, Env> => ({
    _F: ShowURI,
    refined: (getShow, _ref, name, config) => (env) =>
      introduce(getShow(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(
              {
                show: (x) => `<${name}>(${show.show(x)})`
              },
              env,
              {
                show
              }
            )
          )
      )
  })
)
