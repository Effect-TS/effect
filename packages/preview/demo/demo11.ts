import { pipe } from "../src/Function"
import * as M from "../src/Map"
import * as R from "../src/Reader"

pipe(
  new Map<string, number>([
    ["0", 0],
    ["1", 1],
    ["2", 2]
  ]),
  M.foreachF(R.Applicative)((n) => R.access((s: string) => `s: ${s} (${n})`)),
  R.runEnv("str"),
  (out) => {
    console.log(out)
  }
)
