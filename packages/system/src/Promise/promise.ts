// ets_tracing: off

import type { FiberID } from "../Fiber/id.js"
import type { AtomicReference } from "../Support/AtomicReference/index.js"
import type { State } from "./state.js"

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: readonly FiberID[]
  ) {}
}
