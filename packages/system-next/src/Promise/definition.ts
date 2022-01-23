import type { FiberId } from "../FiberId"
import type { AtomicReference } from "../Support/AtomicReference"
import type { State } from "./_internal/state"

export class Promise<E, A> {
  constructor(
    readonly state: AtomicReference<State<E, A>>,
    readonly blockingOn: FiberId
  ) {}
}
