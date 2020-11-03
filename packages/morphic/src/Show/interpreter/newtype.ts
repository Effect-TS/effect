import { pipe } from "@effect-ts/core/Function"

import type { NewtypeURI } from "../../Algebra/Newtype"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showNewtypeInterpreter = interpreter<ShowURI, NewtypeURI>()(() => ({
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
}))
