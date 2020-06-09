import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

export const showRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<ShowURI, Env> => ({
    _F: ShowURI,
    refined: (getShow, _ref, config) => (env) =>
      introduce(getShow(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config?.conf)(
              {
                show: (x) =>
                  config?.name ? `<${config.name}>(${show.show(x)})` : show.show(x)
              },
              env,
              {
                show,
                showRefined: show
              }
            )
          )
      ),
    constrained: (getShow, _ref, config) => (env) =>
      introduce(getShow(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config?.conf)(
              {
                show: (x) =>
                  config?.name ? `<${config.name}>(${show.show(x)})` : show.show(x)
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
