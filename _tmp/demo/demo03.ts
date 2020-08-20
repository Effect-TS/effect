import { provideSomeF } from "../src/_abstract/DSL"
import * as A from "../src/Array"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"

interface Env {
  foo: string
}

pipe(
  A.range(0, 10),
  A.foreachF(T.Applicative)((n) => T.succeed(n + 1)),
  T.chain((ns) =>
    T.access((_: Env) => {
      console.log(_.foo)
      console.log(ns)
    })
  ),
  provideSomeF(T.Environmental)((): Env => ({ foo: "ok" })),
  T.runMain
)
