// from https://github.com/akheron/js-optics-benchmark/blob/master/test/benchmark.test.ts

import * as O from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/core/Persistent/List"

import * as Lens from "../src/Lens"
import * as Traversal from "../src/Traversal"

const size = 5000
const mid = Math.floor(size / 2)
const id = "id-" + mid
const nameModified = "Luke-" + mid + "-modified"

const makeNames = () => {
  let arr = L.emptyPushable()
  for (let i = 0; i < size; i++)
    arr = L.push(
      {
        id: "id-" + i,
        name: "Luke-" + i
      },
      arr
    )

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

it("monocle-ts traversal list", () => {
  const optics = pipe(
    Lens.id<any>(),
    Lens.prop("m"),
    Lens.prop("n"),
    Lens.prop("names"),
    Lens.traverse(L.Traversable),
    Traversal.filter((child: any) => child.id === id)
  )

  const modify = pipe(
    optics,
    Traversal.modify((s) => ({ ...s, name: nameModified }))
  )

  let r = undefined
  const fn = () => (r = modify(data))
  run(fn)

  const w = L.first(Traversal.getAllList(r)(optics))

  expect(w).toEqual(O.some({ id, name: nameModified }))
})
