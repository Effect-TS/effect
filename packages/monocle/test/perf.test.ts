// from https://github.com/akheron/js-optics-benchmark/blob/master/test/benchmark.test.ts

import * as O from "@effect-ts/core/Common/Option"
import { pipe } from "@effect-ts/core/Function"

import * as Lens from "../src/Lens"
import * as Optional from "../src/Optional"

const size = 5000
const mid = Math.floor(size / 2)
const id = "id-" + mid
const nameModified = "Luke-" + mid + "-modified"

const makeNames = () => {
  const arr = []
  for (let i = 0; i < size; i++)
    arr.push({
      id: "id-" + i,
      name: "Luke-" + i
    })

  return arr
}

const data = {
  a: {
    b: {
      c: { d: { e: "hello" } }
    }
  },

  m: {
    n: {
      names: makeNames()
    }
  }
}

const repeat = 1000 //50000

const run = (fn: () => any) => {
  for (let i = 0; i < repeat; i++) fn()
}

it("benchmark", () => {
  const optics = pipe(
    Lens.id<any>(),
    Lens.prop("m"),
    Lens.prop("n"),
    Lens.prop("names"),
    Lens.findFirst((child: any) => child.id === id)
  )

  const modify = pipe(
    optics,
    Optional.modify((s) => ({ ...s, name: nameModified }))
  )

  let r = undefined
  const fn = () => (r = modify(data))
  run(fn)

  const w = optics.getOption(r)

  expect(w).toEqual(O.some({ id, name: nameModified }))
})
