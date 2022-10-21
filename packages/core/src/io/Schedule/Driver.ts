import { _Env, _In, _Out, _State } from "@effect/core/io/Schedule/definition"

export const DriverSym = Symbol.for("@effect/core/io/Schedule/Driver")
export type DriverSym = typeof DriverSym

/**
 * @tsplus type effect/core/io/Schedule/Driver
 * @tsplus companion effect/core/io/Schedule/Driver.Ops
 */
export class Driver<State, Env, In, Out> {
  readonly [DriverSym]: DriverSym = DriverSym

  readonly [_Env]!: (_: Env) => void
  readonly [_In]!: (_: In) => void
  readonly [_Out]!: () => Out
  readonly [_State]!: unknown

  constructor(
    readonly next: (input: In) => Effect<Env, Maybe<never>, Out>,
    readonly last: Effect<never, NoSuchElement, Out>,
    readonly reset: Effect<never, never, void>,
    readonly state: Effect<never, never, State>
  ) {}
}

/**
 * @tsplus static effect/core/io/Schedule/Driver.Ops __call
 */
export function make<State, Env, In, Out>(
  next: (input: In) => Effect<Env, Maybe<never>, Out>,
  last: Effect<never, NoSuchElement, Out>,
  reset: Effect<never, never, void>,
  state: Effect<never, never, State>
): Driver<State, Env, In, Out> {
  return new Driver(next, last, reset, state)
}
