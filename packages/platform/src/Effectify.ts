/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import * as internal from "./internal/effectify.js"

interface Callback<E, A> {
  (err: E, a?: A): void
}

type ArgsWithCallback<Args extends Array<any>, E, A> = [...args: Args, cb: Callback<E, A>]

type WithoutNull<A> = unknown extends A ? void : Exclude<A, null | undefined>

/**
 * Converts a callback-based function to a function that returns an `Effect`.
 *
 * @since 1.0.0
 */
export type Effectify<T, E> = T extends {
  (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
  (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
  (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
  (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
  (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
  (...args: ArgsWithCallback<infer Args6, infer _E6, infer A6>): infer _R6
  (...args: ArgsWithCallback<infer Args7, infer _E7, infer A7>): infer _R7
  (...args: ArgsWithCallback<infer Args8, infer _E8, infer A8>): infer _R8
  (...args: ArgsWithCallback<infer Args9, infer _E9, infer A9>): infer _R9
  (...args: ArgsWithCallback<infer Args10, infer _E10, infer A10>): infer _R10
} ? {
    (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
    (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
    (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
    (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
    (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
    (...args: Args6): Effect.Effect<never, E, WithoutNull<A6>>
    (...args: Args7): Effect.Effect<never, E, WithoutNull<A7>>
    (...args: Args8): Effect.Effect<never, E, WithoutNull<A8>>
    (...args: Args9): Effect.Effect<never, E, WithoutNull<A9>>
    (...args: Args10): Effect.Effect<never, E, WithoutNull<A10>>
  }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
    (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
    (...args: ArgsWithCallback<infer Args6, infer _E6, infer A6>): infer _R6
    (...args: ArgsWithCallback<infer Args7, infer _E7, infer A7>): infer _R7
    (...args: ArgsWithCallback<infer Args8, infer _E8, infer A8>): infer _R8
    (...args: ArgsWithCallback<infer Args9, infer _E9, infer A9>): infer _R9
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
      (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
      (...args: Args6): Effect.Effect<never, E, WithoutNull<A6>>
      (...args: Args7): Effect.Effect<never, E, WithoutNull<A7>>
      (...args: Args8): Effect.Effect<never, E, WithoutNull<A8>>
      (...args: Args9): Effect.Effect<never, E, WithoutNull<A9>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
    (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
    (...args: ArgsWithCallback<infer Args6, infer _E6, infer A6>): infer _R6
    (...args: ArgsWithCallback<infer Args7, infer _E7, infer A7>): infer _R7
    (...args: ArgsWithCallback<infer Args8, infer _E8, infer A8>): infer _R8
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
      (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
      (...args: Args6): Effect.Effect<never, E, WithoutNull<A6>>
      (...args: Args7): Effect.Effect<never, E, WithoutNull<A7>>
      (...args: Args8): Effect.Effect<never, E, WithoutNull<A8>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
    (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
    (...args: ArgsWithCallback<infer Args6, infer _E6, infer A6>): infer _R6
    (...args: ArgsWithCallback<infer Args7, infer _E7, infer A7>): infer _R7
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
      (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
      (...args: Args6): Effect.Effect<never, E, WithoutNull<A6>>
      (...args: Args7): Effect.Effect<never, E, WithoutNull<A7>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
    (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
    (...args: ArgsWithCallback<infer Args6, infer _E6, infer A6>): infer _R6
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
      (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
      (...args: Args6): Effect.Effect<never, E, WithoutNull<A6>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
    (...args: ArgsWithCallback<infer Args5, infer _E5, infer A5>): infer _R5
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
      (...args: Args5): Effect.Effect<never, E, WithoutNull<A5>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
    (...args: ArgsWithCallback<infer Args4, infer _E4, infer A4>): infer _R4
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
      (...args: Args4): Effect.Effect<never, E, WithoutNull<A4>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
    (...args: ArgsWithCallback<infer Args3, infer _E3, infer A3>): infer _R3
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
      (...args: Args3): Effect.Effect<never, E, WithoutNull<A3>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
    (...args: ArgsWithCallback<infer Args2, infer _E2, infer A2>): infer _R2
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
      (...args: Args2): Effect.Effect<never, E, WithoutNull<A2>>
    }
  : T extends {
    (...args: ArgsWithCallback<infer Args1, infer _E1, infer A1>): infer _R1
  } ? {
      (...args: Args1): Effect.Effect<never, E, WithoutNull<A1>>
    }
  : never

/**
 * @category util
 * @since 1.0.0
 */
export type EffectifyError<T> = T extends {
  (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
  (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
  (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
  (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
  (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
  (...args: ArgsWithCallback<infer _Args6, infer E6, infer _A6>): infer _R6
  (...args: ArgsWithCallback<infer _Args7, infer E7, infer _A7>): infer _R7
  (...args: ArgsWithCallback<infer _Args8, infer E8, infer _A8>): infer _R8
  (...args: ArgsWithCallback<infer _Args9, infer E9, infer _A9>): infer _R9
  (...args: ArgsWithCallback<infer _Args10, infer E10, infer _A10>): infer _R10
} ? NonNullable<E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | E10>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
    (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
    (...args: ArgsWithCallback<infer _Args6, infer E6, infer _A6>): infer _R6
    (...args: ArgsWithCallback<infer _Args7, infer E7, infer _A7>): infer _R7
    (...args: ArgsWithCallback<infer _Args8, infer E8, infer _A8>): infer _R8
    (...args: ArgsWithCallback<infer _Args9, infer E9, infer _A9>): infer _R9
  } ? NonNullable<E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
    (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
    (...args: ArgsWithCallback<infer _Args6, infer E6, infer _A6>): infer _R6
    (...args: ArgsWithCallback<infer _Args7, infer E7, infer _A7>): infer _R7
    (...args: ArgsWithCallback<infer _Args8, infer E8, infer _A8>): infer _R8
  } ? NonNullable<E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
    (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
    (...args: ArgsWithCallback<infer _Args6, infer E6, infer _A6>): infer _R6
    (...args: ArgsWithCallback<infer _Args7, infer E7, infer _A7>): infer _R7
  } ? NonNullable<E1 | E2 | E3 | E4 | E5 | E6 | E7>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
    (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
    (...args: ArgsWithCallback<infer _Args6, infer E6, infer _A6>): infer _R6
  } ? NonNullable<E1 | E2 | E3 | E4 | E5 | E6>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
    (...args: ArgsWithCallback<infer _Args5, infer E5, infer _A5>): infer _R5
  } ? NonNullable<E1 | E2 | E3 | E4 | E5>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
    (...args: ArgsWithCallback<infer _Args4, infer E4, infer _A4>): infer _R4
  } ? NonNullable<E1 | E2 | E3 | E4>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
    (...args: ArgsWithCallback<infer _Args3, infer E3, infer _A3>): infer _R3
  } ? NonNullable<E1 | E2 | E3>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
    (...args: ArgsWithCallback<infer _Args2, infer E2, infer _A2>): infer _R2
  } ? NonNullable<E1 | E2>
  : T extends {
    (...args: ArgsWithCallback<infer _Args1, infer E1, infer _A1>): infer _R1
  } ? NonNullable<E1>
  : never

/**
 * @since 1.0.0
 */
export const effectify: {
  <F extends (...args: Array<any>) => any>(fn: F): Effectify<F, EffectifyError<F>>
  <F extends (...args: Array<any>) => any, E>(
    fn: F,
    onError: (error: EffectifyError<F>, args: Parameters<F>) => E
  ): Effectify<F, E>
  <F extends (...args: Array<any>) => any, E, E2>(
    fn: F,
    onError: (error: EffectifyError<F>, args: Parameters<F>) => E,
    onSyncError: (error: unknown, args: Parameters<F>) => E2
  ): Effectify<F, E | E2>
} = internal.effectify
