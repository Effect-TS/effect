import { constant, constVoid } from "../../data/Function"
import type { NoSuchElementException } from "../../data/GlobalExceptions"
import type { Option } from "../../data/Option"
import type { Effect, IO, UIO } from "../../io/Effect"
import { _Env, _In, _Out, _State } from "./definition"

export const DriverSym = Symbol.for("@effect-ts/core/io/Schedule/Driver")
export type DriverSym = typeof DriverSym

/**
 * @tsplus type ets/ScheduleDriver
 */
export interface Driver<State, Env, In, Out> {
  readonly [DriverSym]: DriverSym

  readonly [_Env]: (_: Env) => void
  readonly [_In]: (_: In) => void
  readonly [_Out]: () => Out
  readonly [_State]: unknown

  readonly next: (input: In) => Effect<Env, Option<never>, Out>
  readonly last: IO<NoSuchElementException, Out>
  readonly reset: UIO<void>
  readonly state: UIO<State>
}

/**
 * @tsplus type ets/ScheduleDriverOps
 */
export interface DriverOps {}
export const Driver: DriverOps = {}

/**
 * @tsplus static ets/ScheduleDriverOps __call
 */
export function makeScheduleDriver<State, Env, In, Out>(
  next: (input: In) => Effect<Env, Option<never>, Out>,
  last: IO<NoSuchElementException, Out>,
  reset: UIO<void>,
  state: UIO<State>
): Driver<State, Env, In, Out> {
  return {
    [DriverSym]: DriverSym,
    [_Env]: constVoid,
    [_In]: constVoid,
    [_Out]: constant<Out>(undefined as any),
    [_State]: undefined as any,
    next,
    last,
    reset,
    state
  }
}
