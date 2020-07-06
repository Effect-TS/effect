import { pipe } from "../../Function"
import * as T from "../Effect"

pipe(
  T.of,
  T.bind("foo", () => T.succeedNow(1)),
  T.merge(() => T.sequenceS({ bar: T.succeedNow(2), baz: T.succeedNow(3) })),
  T.tap((s) =>
    T.effectTotal(() => {
      console.log(s)
    })
  ),
  T.runMain
)
