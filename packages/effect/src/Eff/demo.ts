import { pipe } from "../Function"

import * as T from "./Effect"
import { makeUnbounded } from "./Queue"

pipe(
  makeUnbounded<number>(),
  T.tap((q) => q.offer(0)),
  T.tap((q) => q.offer(1)),
  T.tap((q) => q.offer(2)),
  T.tap((q) => q.offer(3)),
  T.tap((q) => q.offer(4)),
  T.chain((q) => q.takeAll),
  T.chain((n) =>
    T.effectTotal(() => {
      console.log(n)
    })
  ),
  T.unsafeRunMain
)
