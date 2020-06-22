import * as T from "./Effect"

const cancel = T.unsafeRunMain(
  T.bracket_(
    T.succeedNow(1),
    () => T.die("error"),
    () => T.delay(100)(T.unit)
  )
)

cancel()
