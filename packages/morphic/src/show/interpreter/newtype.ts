import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

export const showNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<ShowURI, Env> => ({
    _F: ShowURI,
    newtypeIso: (iso, a, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config?.conf)(
              {
                show: (x) =>
                  config?.name
                    ? `<${config.name}>(${show.show(iso.reverseGet(x))})`
                    : show.show(iso.reverseGet(x))
              },
              env,
              {
                show
              }
            )
          )
      ),
    newtypePrism: (prism, a, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config?.conf)(
              {
                show: (x) =>
                  config?.name
                    ? `<${config.name}>(${show.show(prism.reverseGet(x))})`
                    : show.show(prism.reverseGet(x))
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
