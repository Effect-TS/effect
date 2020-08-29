import type { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import { makeExit_ } from "../../Managed"
import { managed } from "./managed"

export const bracketExit = <S1, R1, A>(
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<S1, R1, never, unknown>
) => <S, R, E>(acquire: Effect<S, R, E, A>) => managed(makeExit_(acquire, release))
