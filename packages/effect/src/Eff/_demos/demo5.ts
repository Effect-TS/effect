import { pipe } from "../../Function"
import * as T from "../Effect"
import * as M from "../Managed"

const managedExample = pipe(
  T.accessM(({ foo }: { foo: string }) => T.delay(1000)(T.succeedNow(foo))),
  M.makeExit((s, e) =>
    T.accessM((_: { bar: string }) =>
      T.delay(1000)(
        T.effectTotal(() => {
          console.log("release:", s, _.bar, e)
        })
      )
    )
  )
)

const zipped = M.zipWithPar_(managedExample, managedExample, (a, b) => `${a}-${b}`)

pipe(
  zipped,
  M.use((s) =>
    T.effectTotal(() => {
      console.log("use:", s)
      return `used: ${s}`
    })
  ),
  T.provideAll({ foo: "foo", bar: "bar" }),
  T.runMain
)
