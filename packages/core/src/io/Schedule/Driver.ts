import type { NoSuchElementException } from "@effect/core/io/Cause/errors"
import { _Env, _In, _Out, _State } from "@effect/core/io/Schedule/definition"
import type { Option } from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const DriverSym = Symbol.for("@effect/core/io/Schedule/Driver")

/**
 * @category symbol
 * @since 1.0.0
 */
export type DriverSym = typeof DriverSym

/**
 * @tsplus type effect/core/io/Schedule/Driver
 * @tsplus companion effect/core/io/Schedule/Driver.Ops
 * @category model
 * @since 1.0.0
 */
export class Driver<State, Env, In, Out> {
  readonly [DriverSym]: DriverSym = DriverSym

  readonly [_Env]!: (_: Env) => void
  readonly [_In]!: (_: In) => void
  readonly [_Out]!: () => Out
  readonly [_State]!: unknown

  constructor(
    readonly next: (input: In) => Effect<Env, Option<never>, Out>,
    readonly last: Effect<never, NoSuchElementException, Out>,
    readonly reset: Effect<never, never, void>,
    readonly state: Effect<never, never, State>
  ) {}
}

/**
 * @tsplus static effect/core/io/Schedule/Driver.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make<State, Env, In, Out>(
  next: (input: In) => Effect<Env, Option<never>, Out>,
  last: Effect<never, NoSuchElementException, Out>,
  reset: Effect<never, never, void>,
  state: Effect<never, never, State>
): Driver<State, Env, In, Out> {
  return new Driver(next, last, reset, state)
}
