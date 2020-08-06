import { pipe } from "../../src/Function"
import * as Array from "../../src/next/Prelude/Array"
import * as Effect from "../../src/next/Prelude/Effect"

pipe(
  Array.range(0, 10),
  Array.Traversable.foreach(Effect.Applicative)((n) => Effect.succeed(n + 1)),
  Effect.chain((ns) =>
    Effect.effectTotal(() => {
      console.log(ns)
    })
  ),
  Effect.runMain
)
