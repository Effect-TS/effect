import { pipe } from "@effect-ts/core/Function"
import { getShow as SgetShow } from "@effect-ts/core/Set"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showSetInterpreter = interpreter<ShowURI, SetURI>()(() => ({
  _F: ShowURI,
  set: (getShow, _ord, config) => (env) =>
    pipe(
      getShow(env).show,
      (show) =>
        new ShowType(showApplyConfig(config?.conf)(SgetShow(show), env, { show }))
    )
}))
