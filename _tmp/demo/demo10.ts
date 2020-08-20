import { pipe } from "../src/Function"
import * as P from "../src/XPure"

pipe(
  P.modify((n: number) => [`${n + 1}`, `(${n})`]),
  P.chain((n) => P.Access.access((s: string) => `${s}: ${n}`)),
  P.provideAll("sss"),
  P.runStateEither(111),
  (res) => {
    console.log(res)
  }
)
