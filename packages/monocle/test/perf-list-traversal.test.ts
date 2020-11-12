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

interface NameId {
  name: string
  id: string
}

const makeNames = (): L.List<NameId> => {
  const arr = L.emptyPushable<NameId>()
  for (let i = 0; i < size; i++)
    L.push(
      {
        id: "id-" + i,
        name: "Luke-" + i
      },
      arr
    )

  return arr
}

const data = {
  m: {
    n: {
      names: makeNames()
    }
  }
}

const repeat = 1000 //50000

const run = <A>(fn: () => A): A => {
  let r = undefined
  for (let i = 0; i < repeat; i++) {
    r = fn()
  }
  return r as any
}

it("monocle-ts traversal list", () => {
  const optics = pipe(
    Lens.id<typeof data>(),
    Lens.prop("m"),
    Lens.prop("n"),
    Lens.prop("names"),
    Lens.traverse(L.Traversable),
    Traversal.filter((child) => child.id === id)
  )

  const modify = pipe(
    optics,
    Traversal.modify((s) => ({ ...s, name: nameModified }))
  )

  const fn = () => modify(data)
  const r = run(fn)

  const w = L.first(Traversal.getAllList(r)(optics))

  expect(w).toEqual<O.Option<NameId>>(O.some({ id, name: nameModified }))
})
