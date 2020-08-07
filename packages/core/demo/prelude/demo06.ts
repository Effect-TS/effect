import { pipe } from "../../src/Function"
import * as F from "../../src/next/Prelude/Pure"

const result = pipe(
  F.succeed(0),
  F.chain((n) => F.succeed(n + 1)),
  F.chain((n) => (n === 0 ? F.fail(`fail: ${n}`) : F.succeed(n))),
  F.runEither
)

console.log(result)
