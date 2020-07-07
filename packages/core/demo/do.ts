import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"

const program = pipe(
  T.of,
  T.bind("foo", () => T.succeedNow(1)),
  T.bindAll(() => ({ bar: T.succeedNow(2), baz: T.succeedNow(3) })),
  T.let("red", () => 4),
  T.tap((s) =>
    T.effectTotal(() => {
      console.log(s)
    })
  )
)

T.runMain(program)
