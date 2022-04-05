import { _Env, _In, _Out, _State } from "@effect-ts/core/io/Schedule/definition";

export const DriverSym = Symbol.for("@effect-ts/core/io/Schedule/Driver");
export type DriverSym = typeof DriverSym;

/**
 * @tsplus type ets/Schedule/Driver
 * @tsplus companion ets/Schedule/Driver/Ops
 */
export class Driver<State, Env, In, Out> {
  readonly [DriverSym]: DriverSym = DriverSym;

  readonly [_Env]!: (_: Env) => void;
  readonly [_In]!: (_: In) => void;
  readonly [_Out]!: () => Out;
  readonly [_State]!: unknown;

  constructor(
    readonly next: (input: In) => Effect<Env, Option<never>, Out>,
    readonly last: IO<NoSuchElement, Out>,
    readonly reset: UIO<void>,
    readonly state: UIO<State>
  ) {}
}

/**
 * @tsplus static ets/Schedule/Driver/Ops __call
 */
export function make<State, Env, In, Out>(
  next: (input: In) => Effect<Env, Option<never>, Out>,
  last: IO<NoSuchElement, Out>,
  reset: UIO<void>,
  state: UIO<State>
): Driver<State, Env, In, Out> {
  return new Driver(next, last, reset, state);
}
