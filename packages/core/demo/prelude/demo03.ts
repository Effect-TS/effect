import { pipe } from "../../src/Function"
import * as A from "../../src/next/Prelude/Array"
import * as T from "../../src/next/Prelude/Effect"

interface Env {
  foo: string
}

pipe(
  A.range(0, 10),
  A.Traversable.foreach(T.Applicative)((n) => T.succeed(n + 1)),
  T.chain((ns) =>
    T.access((_: Env) => {
      console.log(_.foo)
      console.log(ns)
    })
  ),
  T.ContravariantEnv.contramap((): Env => ({ foo: "ok" })),
  T.runMain
)
