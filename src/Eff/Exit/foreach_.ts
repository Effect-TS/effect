import { Effect } from "../Effect/effect"
import { result } from "../Effect/result"
import { succeedNow } from "../Effect/succeedNow"

import { Exit } from "./exit"
import { halt as haltExit } from "./halt"

export const foreach_ = <E2, A2, S, R, E, A>(
  exit: Exit<E2, A2>,
  f: (a: A2) => Effect<S, R, E, A>
): Effect<S, R, never, Exit<E | E2, A>> => {
  switch (exit._tag) {
    case "Failure": {
      return succeedNow(haltExit(exit.cause))
    }
    case "Success": {
      return result(f(exit.value))
    }
  }
}
