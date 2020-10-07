import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<ShowURI, Env> => ({
    _F: ShowURI,
    newtypeIso: (iso, a, config) => (env) =>
      pipe(
        a(env).show,
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
      pipe(
        a(env).show,
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
