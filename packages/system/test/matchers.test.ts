import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as IO from "../src/IO"
import * as M from "../src/Managed"
import * as S from "../src/Sync"
import { matchTag, matchTagFor } from "../src/Utils"

interface A {
  _tag: "A"
  a: number
}
interface B {
  _tag: "B"
  b: string
}
interface C {
  _tag: "C"
  c: symbol
}
type ADT = A | B | C

function adt(): ADT {
  return {
    _tag: "A",
    a: 0
  }
}

export const matchEffect = pipe(
  adt(),
  matchTag({
    A: (_) => T.succeed(_),
    B: (_) => T.succeed(_),
    C: (_) => T.succeed(_)
  })
)

export const matchSync = pipe(
  adt(),
  matchTag({
    A: (_) => S.succeed(_),
    B: (_) => S.succeed(_),
    C: (_) => S.succeed(_)
  })
)

export const matchManaged = pipe(
  adt(),
  matchTag({
    A: (_) => M.succeed(_),
    B: (_) => M.succeed(_),
    C: (_) => M.succeed(_)
  })
)

export const matchIO = pipe(
  adt(),
  matchTag({
    A: (_) => IO.succeed(_),
    B: (_) => IO.succeed(_),
    C: (_) => IO.succeed(_)
  })
)

export const matchIOFor = matchTagFor<ADT>()({
  A: (_) => IO.succeed(_),
  B: (_) => IO.succeed(_),
  C: (_) => IO.succeed(_)
})

it("io", () => {
  expect(IO.run(matchIO)).toEqual({ _tag: "A", a: 0 })
})

it("ioFor", () => {
  expect(IO.run(matchIOFor(adt()))).toEqual({ _tag: "A", a: 0 })
})
