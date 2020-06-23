import { addDelay_ } from "./addDelay_"
import { Schedule } from "./schedule"

/**
 * A new schedule derived from the specified schedule which transforms the delays into effectful sleeps.
 */
export const delayed = <S, R, ST, A>(self: Schedule<S, R, ST, A, number>) =>
  addDelay_(self, (n) => n)
