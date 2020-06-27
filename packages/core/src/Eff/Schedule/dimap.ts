import { contramap_ } from "./contramap"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export const dimap_ = <S, R, A, B, A1, C>(
  self: Schedule<S, R, A, B>,
  f: (a: A1) => A,
  g: (b: B) => C
): Schedule<S, R, A1, C> => map_(contramap_(self, f), g)

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export const dimap = <A, A1>(f: (a: A1) => A) => <B, C>(g: (b: B) => C) => <S, R>(
  self: Schedule<S, R, A, B>
): Schedule<S, R, A1, C> => map_(contramap_(self, f), g)
