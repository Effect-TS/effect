import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowURI, ShowType } from "../hkt"

import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

export const showNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<ShowURI, Env> => ({
    _F: ShowURI,
    newtype: (name) => (a, config) => (env) =>
      new ShowType(
        showApplyConfig(config)(
          { show: (x) => `<${name}>(${a(env).show.show(x as any)})` },
          env
        )
      )
  })
)
