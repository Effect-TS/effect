import type { AtomicReference } from "../../../support/AtomicReference"
import type { FiberId } from "../../FiberId"
import type { Promise } from "../definition"
import type { PromiseState } from "./state"

export class PromiseInternal<E, A> implements Promise<E, A> {
  constructor(
    readonly state: AtomicReference<PromiseState<E, A>>,
    readonly blockingOn: FiberId
  ) {}
}
