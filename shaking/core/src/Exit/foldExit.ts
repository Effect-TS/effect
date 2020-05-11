import type { Effect, Managed, Stream, StreamEither } from "../Support/Common/types"

import type { Cause, Exit } from "./Exit"
import { isDone } from "./isDone"

export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => StreamEither<S2, R2, E2, B2>,
  onDone: (v: A) => StreamEither<S1, R1, E1, B1>
): (e: Exit<E, A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Stream<S2, R2, E2, B2>,
  onDone: (v: A) => Stream<S1, R1, E1, B1>
): (e: Exit<E, A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Managed<S2, R2, E2, B2>,
  onDone: (v: A) => Managed<S1, R1, E1, B1>
): (e: Exit<E, A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<S1, S2, R1, R2, E, E1, E2, A, B1, B2>(
  onCause: (v: Cause<E>) => Effect<S2, R2, E2, B2>,
  onDone: (v: A) => Effect<S1, R1, E1, B1>
): (e: Exit<E, A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B1 | B2>
export function foldExit<E, A, B1, B2>(
  onCause: (v: Cause<E>) => B2,
  onDone: (v: A) => B1
): (e: Exit<E, A>) => B1 | B2
export function foldExit<E, A, B1, B2>(
  onCause: (v: Cause<E>) => B2,
  onDone: (v: A) => B1
): (e: Exit<E, A>) => B1 | B2
export function foldExit<E, A, B>(
  onCause: (v: Cause<E>) => B,
  onDone: (v: A) => B
): (e: Exit<E, A>) => B {
  return (e) => (isDone(e) ? onDone(e.value) : onCause(e))
}
