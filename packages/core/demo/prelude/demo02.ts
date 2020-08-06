import { pipe } from "../../src/Function"
import * as Array from "../../src/next/Prelude/Array"
import * as Async from "../../src/next/Prelude/Async"

pipe(
  Array.range(0, 10),
  Array.Traversable.foreach(Async.ApplicativePar)((n) => Async.succeed(n + 1)),
  Async.chain((ns) =>
    Async.effectTotal(() => {
      console.log(ns)
    })
  ),
  Async.runMain
)
