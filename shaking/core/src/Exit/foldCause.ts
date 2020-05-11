import type { NonEmptyArray } from "../NonEmptyArray"
import type { Option } from "../Option"
import type { Effect, Managed, Stream, StreamEither } from "../Support/Common/types"

import type { Cause, Interrupt } from "./Exit"
import { isAbort } from "./isAbort"
import { isRaise } from "./isRaise"

export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Effect<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Effect<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Managed<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Managed<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Managed<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Stream<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => Stream<S4, R4, E4, B4>
): (
  e: Cause<E>
) => Stream<S1 | S2 | S3 | S4, R1 & R2 & R3 & R4, E1 | E2 | E3 | E4, B1 | B2 | B3 | B4>
export function foldCause<
  S1,
  S2,
  S3,
  S4,
  E,
  B1,
  B2,
  B3,
  B4,
  R1,
  E1,
  R2,
  E2,
  R3,
  E3,
  R4,
  E4
>(
  onRaise: (
    v: E,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S2, R2, E2, B2>,
  onAbort: (
    v: unknown,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => StreamEither<S3, R3, E3, B3>,
  onInterrupt: (i: Interrupt) => StreamEither<S4, R4, E4, B4>
): (
  e: Cause<E>
) => StreamEither<
  S1 | S2 | S3 | S4,
  R1 & R2 & R3 & R4,
  E1 | E2 | E3 | E4,
  B1 | B2 | B3 | B4
>
export function foldCause<E, B1, B2, B3, B4>(
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B2,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B3,
  onInterrupt: (i: Interrupt) => B4
): (e: Cause<E>) => B1 | B2 | B3 | B4
export function foldCause<E, B>(
  onRaise: (v: E, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onAbort: (v: unknown, remaining: Option<NonEmptyArray<Cause<any>>>) => B,
  onInterrupt: (i: Interrupt) => B
): (e: Cause<E>) => B {
  return (e) =>
    isRaise(e)
      ? onRaise(e.error, e.remaining)
      : isAbort(e)
      ? onAbort(e.abortedWith, e.remaining)
      : onInterrupt(e)
}
