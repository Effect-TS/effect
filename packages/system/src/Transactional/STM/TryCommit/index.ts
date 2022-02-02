// ets_tracing: off

import "../../../Operator/index.js"

import type * as T from "../../../Effect/index.js"
import type { Journal } from "../Journal/index.js"

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
