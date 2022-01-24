import type { Effect } from "../../Effect"

export type CancelerState = Empty | Pending | Registered

export interface Empty {
  readonly _tag: "Empty"
}

export interface Pending {
  readonly _tag: "Pending"
}

export class Registered {
  readonly _tag = "Registered"

  constructor(readonly asyncCanceler: Effect<any, any, any>) {}
}

export const Empty: CancelerState = {
  _tag: "Empty"
}

export const Pending: CancelerState = {
  _tag: "Pending"
}
