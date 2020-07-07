import { Effect } from "../Effect/effect"

export class Schedule<S, R, ST, A, B> {
  constructor(
    readonly initial: Effect<S, R, never, ST>,
    readonly update: (a: A, s: ST) => Effect<S, R, void, ST>,
    readonly extract: (a: A, s: ST) => B
  ) {}
}
