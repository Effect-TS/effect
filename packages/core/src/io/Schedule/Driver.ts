import type { NoSuchElementException } from "../../data/GlobalExceptions"
import type { Option } from "../../data/Option"
import type { Effect, IO, UIO } from "../../io/Effect"
import { _Env, _In, _Out, _State } from "./definition"

export const DriverSym = Symbol.for("@effect-ts/core/io/Schedule/Driver")
export type DriverSym = typeof DriverSym

/**
 * @tsplus type ets/ScheduleDriver
 * @tsplus companion ets/ScheduleDriverOps
 */
export class Driver<State, Env, In, Out> {
  readonly [DriverSym]: DriverSym = DriverSym;

  readonly [_Env]!: (_: Env) => void;
  readonly [_In]!: (_: In) => void;
  readonly [_Out]!: () => Out;
  readonly [_State]!: unknown

  constructor(
    readonly next: (input: In) => Effect<Env, Option<never>, Out>,
    readonly last: IO<NoSuchElementException, Out>,
    readonly reset: UIO<void>,
    readonly state: UIO<State>
  ) {}
}

/**
 * @tsplus static ets/ScheduleDriverOps __call
 */
export function make<State, Env, In, Out>(
  next: (input: In) => Effect<Env, Option<never>, Out>,
  last: IO<NoSuchElementException, Out>,
  reset: UIO<void>,
  state: UIO<State>
): Driver<State, Env, In, Out> {
  return new Driver(next, last, reset, state)
}
