import { contramap_ } from "./contramap"
import { map_ } from "./map_"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export const dimap_ = <S, R, ST, A, B, A1, C>(
  self: Schedule<S, R, ST, A, B>,
  f: (a: A1) => A,
  g: (b: B) => C
): Schedule<S, R, ST, A1, C> => map_(contramap_(self, f), g)

/**
 * Returns a new schedule that contramaps the input and maps the output.
 */
export const dimap = <A, A1>(f: (a: A1) => A) => <B, C>(g: (b: B) => C) => <S, R, ST>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R, ST, A1, C> => map_(contramap_(self, f), g)
