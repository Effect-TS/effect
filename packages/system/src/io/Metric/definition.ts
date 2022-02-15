import { Effect } from "../Effect"
import * as MetricClient from "./MetricClient"
import type { MetricLabel } from "./MetricLabel"

export function countValueWith(name: string, tags: Array<MetricLabel> = []) {
  return <A>(f: (a: A) => number) =>
    <R, E>(self: Effect<R, E, A>): Effect<R, E, A> =>
      Effect.suspendSucceed(() => {
        const counter = MetricClient.unsafeMakeCounter<A>(name, ...tags)
        return self.tap((a) => counter.incrementBy(f(a)))
      })
}
