import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Common/Either"
import * as Selective from "../../src/Prelude/Selective"
import * as IO from "../../src/XPure/XIO"

const SelectiveIO = Selective.monad(IO.Monad)
const branch = Selective.branchF(SelectiveIO)

const x = 0

test("14", () => {
  pipe(
    IO.succeed(x === 0 ? E.left("l" as const) : E.right("r" as const)),
    branch(
      IO.succeed((s: "l") => `left: ${s}`),
      IO.succeed((s: "r") => `right: ${s}`)
    ),
    IO.run,
    (s) => {
      console.log(s)
    }
  )
})
