// ets_tracing: off

import "../../../Operator"

import type * as T from "../../../Effect"
import type { Journal } from "../Journal"

export type TryCommit<E, A> = Done<E, A> | Suspend

export const DoneTypeId = Symbol()
export type DoneTypeId = typeof DoneTypeId

export class Done<E, A> {
  readonly _typeId: DoneTypeId = DoneTypeId
  constructor(readonly io: T.IO<E, A>) {}
}

export const SuspendTypeId = Symbol()
export type SuspendTypeId = typeof SuspendTypeId

export class Suspend {
  readonly _typeId: SuspendTypeId = SuspendTypeId
  constructor(readonly journal: Journal) {}
}
