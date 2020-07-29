import { pipe } from "../../Function"

import * as T from "./effect"
import { Schedule } from "./schedule"

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const foldM_ = <S, R, ST, A, B, Z, S1, R1>(
  self: Schedule<S, R, ST, A, B>,
  z: Z,
  f: (z: Z, b: B) => T.Effect<S1, R1, never, Z>
): Schedule<S | S1, R & R1, [ST, Z], A, Z> =>
  new Schedule<S | S1, R & R1, [ST, Z], A, Z>(
    T.map_(self.initial, (a) => [a, z]),
    (a, s) =>
      pipe(
        T.of,
        T.bind("s1", () => self.update(a, s[0])),
        T.bind("z1", () => f(s[1], self.extract(a, s[0]))),
        T.map((s) => [s.s1, s.z1])
      ),
    (_, s) => s[1]
  )

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const foldM = <Z>(z: Z) => <B, S1, R1>(
  f: (z: Z, b: B) => T.Effect<S1, R1, never, Z>
) => <S, R, ST, A>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S | S1, R & R1, [ST, Z], A, Z> => foldM_(self, z, f)

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const fold_ = <S, R, ST, A, B, Z>(
  self: Schedule<S, R, ST, A, B>,
  z: Z,
  f: (z: Z, b: B) => Z
): Schedule<S, R, [ST, Z], A, Z> => foldM_(self, z, (z, b) => T.succeedNow(f(z, b)))

/**
 * Returns a new schedule that effectfully folds over the outputs of this one.
 */
export const fold = <Z>(z: Z) => <B>(f: (z: Z, b: B) => Z) => <S, R, ST, A>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S, R, [ST, Z], A, Z> => foldM_(self, z, (z, b) => T.succeedNow(f(z, b)))
