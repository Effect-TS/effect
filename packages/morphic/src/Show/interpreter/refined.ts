import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<ShowURI, Env> => ({
    _F: ShowURI,
    refined: (getShow, _ref, config) => (env) =>
      pipe(
        getShow(env).show,
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
      pipe(
        getShow(env).show,
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
