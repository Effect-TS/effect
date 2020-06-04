import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { MatechsAlgebraRefined1 } from "@matechs/morphic-alg/refined"

export const showRefinedInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRefined1<ShowURI, Env> => ({
    _F: ShowURI,
    refined: (getShow, _ref, name, config) => (env) =>
      new ShowType(
        showApplyConfig(config)(
          {
            show: (x) => `<${name}>(${getShow(env).show.show(x)})`
          },
          env
        )
      )
  })
)
