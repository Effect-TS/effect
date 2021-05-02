import * as T from "../Effect"
import type { SpecCase } from "./SpecCase"

export const SpecTypeId = Symbol.for("@effect-ts/system/Testing/Spec")
export type SpecTypeId = typeof SpecTypeId

/**
 * A `Spec[R, E, T]` is the backbone of _ZIO Test_. Every spec is either a
 * suite, which contains other specs, or a test of type `T`. All specs require
 * an environment of type `R` and may potentially fail with an error of type
 * `E`.
 */
export class Spec<R, E, T> {
  readonly [SpecTypeId]: SpecTypeId = SpecTypeId;

  readonly [T._R]: (_: R) => void;
  readonly [T._E]: () => E;
  readonly [T._T]: () => T

  constructor(readonly caseValue: SpecCase<R, E, T, Spec<R, E, T>>) {}
}
