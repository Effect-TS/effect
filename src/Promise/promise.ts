import type { FiberID } from "../Fiber/id"
import type { AtomicReference } from "../Support/AtomicReference"
import type { State } from "./state"

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: readonly FiberID[]
  ) {}
}
