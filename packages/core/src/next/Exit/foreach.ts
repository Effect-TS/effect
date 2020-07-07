import { Effect } from "../Effect/effect"

import { Exit } from "./exit"
import { foreach_ } from "./foreach_"

export const foreach = <A2, S, R, E, A>(f: (a: A2) => Effect<S, R, E, A>) => <E2>(
  exit: Exit<E2, A2>
) => foreach_(exit, f)
