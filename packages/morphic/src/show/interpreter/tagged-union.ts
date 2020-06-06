import { TaggedUnionA } from "../../config"
import { mapRecord, memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type * as S from "@matechs/core/Show"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

declare module "@matechs/morphic-alg/tagged-union" {
  export interface TaggedUnionConfig<Types> {
    [ShowURI]: {
      shows: TaggedUnionA<Types, S.URI>
    }
  }
}

export const showTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<ShowURI, Env> => ({
    _F: ShowURI,
    taggedUnion: (tag, types, _name, config) => (env) => {
      const shows = mapRecord(types, (a) => a(env).show)
      return new ShowType(
        showApplyConfig(config)(
          {
            show: (a): string => (shows as any)[a[tag]].show(a)
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
