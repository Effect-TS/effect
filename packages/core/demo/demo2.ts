import * as T from "../src/next/Effect"

const cancel = T.runMain(
  T.bracket_(
    T.succeedNow(1),
    () => T.die("error"),
    () => T.delay(100)(T.unit)
  )
)

cancel()
