// tracing: off

import type { FiberID } from "../Fiber/id"
import * as St from "../Structural"
import type { AtomicReference } from "../Support/AtomicReference"
import type { State } from "./state"

export class Promise<E, A> implements St.HasHash, St.HasEquals {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: readonly FiberID[]
  ) {}

  [St.hashSym](): number {
    return St.hashIncremental(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return this === that
  }
}
