import type * as S from "@effect-ts/core/Classic/Show"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<ShowURI, Env> => ({
    _F: ShowURI,
    intersection: <A>(
      types: Array<(_: Env) => ShowType<A>>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const shows = types.map((getShow) => getShow(env).show)
      return new ShowType<A>(
        showApplyConfig(config?.conf)(
          <S.Show<A>>{
            show: (a: A) => shows.map((s) => s.show(a)).join(" & ")
          },
          env,
          {
            shows: shows as any
          }
        )
      )
    }
  })
)
