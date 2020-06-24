import { pipe } from "../../Function"
import * as T from "../Effect"
import * as M from "../Managed"

const managedExample = M.makeExit(
  T.accessM(({ foo }: { foo: string }) => T.succeedNow(foo))
)((s, e) =>
  T.accessM((_: { bar: string }) =>
    T.effectTotal(() => {
      console.log("release:", s, _.bar, e)
    })
  )
)

const use = M.use_(managedExample, (s) =>
  T.effectTotal(() => {
    console.log("use:", s)
    return `used: ${s}`
  })
)

pipe(use, T.provideAll({ foo: "foo", bar: "bar" }), T.runMain)
