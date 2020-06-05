import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { UnionToIntersection } from "@matechs/core/Base/Apply"
import { introduce } from "@matechs/core/Function"
import { Show } from "@matechs/core/Show"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraIntersection1,
  IntersectionConfig
} from "@matechs/morphic-alg/intersection"

declare module "@matechs/morphic-alg/intersection" {
  interface IntersectionConfig<L extends unknown[], A extends unknown[]> {
    [ShowURI]: {
      shows: A extends [infer X, infer Y]
        ? [Show<X>, Show<Y>]
        : A extends [infer X, infer Y, infer Z]
        ? [Show<X>, Show<Y>, Show<Z>]
        : A extends [infer X, infer Y, infer Z, infer W]
        ? [Show<X>, Show<Y>, Show<Z>, Show<W>]
        : A extends [infer X, infer Y, infer Z, infer W, infer K]
        ? [Show<X>, Show<Y>, Show<Z>, Show<W>, Show<K>]
        : Show<UnionToIntersection<A[number]>>[]
    }
  }
}

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
        introduce<Show<A>>({
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
