import type { FiberId } from "../FiberId"
import type { State } from "./state"

export class Promise<E, A> {
  constructor(public state: State<E, A>, readonly blockingOn: FiberId) {}
}
