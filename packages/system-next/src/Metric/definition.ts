import * as T from "./_internal/effect"
import * as MetricClient from "./MetricClient"
import type { MetricLabel } from "./MetricLabel"

export function countValueWith(name: string, tags: Array<MetricLabel> = []) {
  return <A>(f: (a: A) => number) =>
    <R, E>(self: T.Effect<R, E, A>): T.Effect<R, E, A> =>
      T.suspendSucceed(() => {
        const counter = MetricClient.unsafeMakeCounter<A>(name, ...tags)
        return T.tap_(self, (a) => counter.incrementBy(f(a)))
      })
}
