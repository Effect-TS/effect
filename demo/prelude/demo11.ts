import { pipe } from "../../src/Function"
import * as M from "../../src/next/Prelude/Map"
import * as R from "../../src/next/Prelude/Reader"

pipe(
  new Map<string, number>([
    ["0", 0],
    ["1", 1],
    ["2", 2]
  ]),
  M.Traversable.foreach(R.Applicative)((n: number) =>
    R.access((s: string) => `s: ${s} (${n})`)
  ),
  R.runEnv("str"),
  (out) => {
    console.log(out)
  }
)
