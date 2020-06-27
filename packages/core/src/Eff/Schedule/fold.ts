import { Effect } from "../Effect/effect"
import { Do } from "../Effect/instances"
import { map_ } from "../Effect/map_"
import { succeedNow } from "../Effect/succeedNow"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const foldM_ = <S, R, A, B, Z, S1, R1>(
  self: Schedule<S, R, A, B>,
  z: Z,
  f: (z: Z, b: B) => Effect<S1, R1, never, Z>
): Schedule<S | S1, R & R1, A, Z> =>
  new ScheduleClass<S | S1, R & R1, [any, Z], A, Z>(
    map_(self.initial, (a) => [a, z]),
    (a, s) =>
      Do()
        .bind("s1", self.update(a, s[0]))
        .bind("z1", f(s[1], self.extract(a, s[0])))
        .return((s) => [s.s1, s.z1]),
    (_, s) => s[1]
  )

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const foldM = <Z>(z: Z) => <B, S1, R1>(
  f: (z: Z, b: B) => Effect<S1, R1, never, Z>
) => <S, R, A>(self: Schedule<S, R, A, B>): Schedule<S | S1, R & R1, A, Z> =>
  foldM_(self, z, f)

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const fold_ = <S, R, A, B, Z>(
  self: Schedule<S, R, A, B>,
  z: Z,
  f: (z: Z, b: B) => Z
): Schedule<S, R, A, Z> => foldM_(self, z, (z, b) => succeedNow(f(z, b)))

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const fold = <Z>(z: Z) => <B>(f: (z: Z, b: B) => Z) => <S, R, A>(
  self: Schedule<S, R, A, B>
): Schedule<S, R, A, Z> => foldM_(self, z, (z, b) => succeedNow(f(z, b)))
