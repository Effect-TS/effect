import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { Array } from "@matechs/core/Array"
import { Ord } from "@matechs/core/Ord"
import { Set, getShow as SgetShow } from "@matechs/core/Set"
import type { MatechsAlgebraSet1 } from "@matechs/morphic-alg/set"

export const showSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<ShowURI, Env> => ({
    _F: ShowURI,
    set: <A>(
      getShow: (env: Env) => ShowType<A>,
      _ord: Ord<A>,
      config?: ConfigsForType<Env, Array<unknown>, Set<A>>
    ) => (env) =>
      new ShowType(showApplyConfig(config)(SgetShow(getShow(env).show), env))
  })
)
