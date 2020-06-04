import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo, mapRecord } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

export const showTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<ShowURI, Env> => ({
    _F: ShowURI,
    taggedUnion: (tag, types, _name, config) => (env) => {
      const shows = mapRecord(types, (a) => a(env).show.show)
      return new ShowType(
        showApplyConfig(config)(
          {
            show: (a): string => (shows as any)[a[tag]](a)
          },
          env
        )
      )
    }
  })
)
