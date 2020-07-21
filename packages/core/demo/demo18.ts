import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as Q from "../src/next/Queue"

pipe(
  T.of,
  T.bind("queue", () => Q.makeUnbounded<number>()),
  T.tap(({ queue }) => queue.offer(1)),
  T.tap(({ queue }) => queue.offer(2)),
  T.tap(({ queue }) => queue.offer(3)),
  T.bind("ns", ({ queue }) => queue.takeAll),
  T.chain(({ ns }) =>
    T.effectTotal(() => {
      console.log(ns)
    })
  ),
  T.runMain
)
