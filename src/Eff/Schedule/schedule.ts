import { Effect } from "../Effect/effect"

export abstract class Schedule<S, R, A, B> {
  abstract readonly _T: any
  abstract readonly initial: Effect<S, R, never, Schedule<S, R, A, B>["_T"]>
  abstract readonly update: (
    a: A,
    s: Schedule<S, R, A, B>["_T"]
  ) => Effect<S, R, void, Schedule<S, R, A, B>["_T"]>
  abstract readonly extract: (a: A, s: Schedule<S, R, A, B>["_T"]) => B
}

export class ScheduleClass<S, R, ST, A, B> extends Schedule<S, R, A, B> {
  readonly _T: ST = undefined as any
  constructor(
    readonly initial: Effect<S, R, never, ST>,
    readonly update: (a: A, s: ST) => Effect<S, R, void, ST>,
    readonly extract: (a: A, s: ST) => B
  ) {
    super()
  }
}
