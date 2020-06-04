import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { MatechsAlgebraIntersection1 } from "@matechs/morphic-alg/intersection"

export const showIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection1<ShowURI, Env> => ({
    _F: ShowURI,
    intersection: <A>(
      types: Array<(_: Env) => ShowType<A>>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A>
    ) => (env: Env) => {
      const shows = types.map((getShow) => getShow(env).show.show)
      return new ShowType<A>(
        showApplyConfig(config)(
          {
            show: (a: A) => shows.map((s) => s(a)).join(" & ")
          },
          env
        )
      )
    }
  })
)
