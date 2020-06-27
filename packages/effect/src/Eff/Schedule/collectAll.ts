import { fold_ } from "./fold"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that collects the outputs of this one into a list.
 */
export const collectAll = <S, R, A, B>(self: Schedule<S, R, A, B>) =>
  fold_(self, [] as readonly B[], (z, b) => [b, ...z])
