import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type * as S from "@matechs/core/Show"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  IntersectionConfig,
  MatechsAlgebraIntersection1
} from "@matechs/morphic-alg/intersection"

export const showIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraIntersection1<ShowURI, Env> => ({
    _F: ShowURI,
    intersection: <A>(
      types: Array<(_: Env) => ShowType<A>>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
    ) => (env: Env) => {
      const shows = types.map((getShow) => getShow(env).show)
      return new ShowType<A>(
        introduce<S.Show<A>>({
          show: (a: A) => shows.map((s) => s.show(a)).join(" & ")
        })((showIntersection) =>
          showApplyConfig(config)(showIntersection, env, {
            shows: shows as any
          })
        )
      )
    }
  })
)
