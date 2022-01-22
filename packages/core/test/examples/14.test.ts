import { pipe } from "@effect-ts/system/Function"

import * as E from "../../src/Either/index.js"
import * as Selective from "../../src/PreludeV2/Selective/index.js"
import * as IO from "../../src/XPure/XIO/index.js"

const SelectiveIO = Selective.monad(IO.Monad)
const branch = Selective.branchF(SelectiveIO)

const x = 0

test("14", () => {
  const program = pipe(
    IO.succeed(x === 0 ? E.left("l" as const) : E.right("r" as const)),
    branch(
      IO.succeed((s: "l") => `left: ${s}`),
      IO.succeed((s: "r") => `right: ${s}`)
    )
  )
  expect(pipe(program, IO.run)).toEqual("left: l")
})
