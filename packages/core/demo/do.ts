import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

const program = pipe(
  T.of,
  T.bind("foo", () => T.succeed(1)),
  T.bindAll(() => ({ bar: T.succeed(2), baz: T.succeed(3) })),
  T.let("red", () => 4),
  T.tap((s) =>
    T.effectTotal(() => {
      console.log(s)
    })
  )
)

T.runMain(program)
