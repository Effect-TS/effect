import { pipe } from "../../Function"
import * as T from "../Effect"
import * as M from "../Managed"

const managedExample = pipe(
  T.accessM(({ foo }: { foo: string }) => T.succeedNow(foo)),
  M.makeExit((s, e) =>
    T.accessM((_: { bar: string }) =>
      T.effectTotal(() => {
        console.log("release:", s, _.bar, e)
      })
    )
  )
)

pipe(
  managedExample,
  M.use((s) =>
    T.effectTotal(() => {
      console.log("use:", s)
      return `used: ${s}`
    })
  ),
  T.provideAll({ foo: "foo", bar: "bar" }),
  T.runMain
)
