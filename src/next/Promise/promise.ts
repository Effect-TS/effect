import { FiberID } from "../Fiber/id"
import { AtomicReference } from "../Support/AtomicReference"

import { State } from "./state"

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: readonly FiberID[]
  ) {}
}
