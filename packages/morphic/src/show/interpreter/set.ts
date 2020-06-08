import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import type { Array } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import type { Ord } from "@matechs/core/Ord"
import { Set, getShow as SgetShow } from "@matechs/core/Set"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet1, SetConfig } from "@matechs/morphic-alg/set"

export const showSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<ShowURI, Env> => ({
    _F: ShowURI,
    set: <A>(
      getShow: (env: Env) => ShowType<A>,
      _ord: Ord<A>,
      config?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
    ) => (env) =>
      introduce(getShow(env).show)(
        (show) => new ShowType(showApplyConfig(config)(SgetShow(show), env, { show }))
      )
  })
)
