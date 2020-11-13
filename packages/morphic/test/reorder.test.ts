import * as S from "@effect-ts/core/Sync"

import * as MO from "../src"
import { reorder } from "../src/Reorder"

const A_ = MO.make((F) => F.interface({ a: F.string() }, { name: "A" }))

export interface A extends MO.AType<typeof A_> {}
export interface AE extends MO.EType<typeof A_> {}
export const A = MO.opaque<AE, A>()(A_)

const B_ = MO.make((F) => F.interface({ b: F.string() }, { name: "B" }))

export interface B extends MO.AType<typeof B_> {}
export interface BE extends MO.EType<typeof B_> {}
export const B = MO.opaque<BE, B>()(B_)

const C_ = MO.make((F) => F.interface({ c: F.string() }, { name: "C" }))

export interface C extends MO.AType<typeof C_> {}
export interface CE extends MO.EType<typeof C_> {}
export const C = MO.opaque<CE, C>()(C_)

const All_ = MO.make((F) => F.intersection(A(F), B(F), C(F))({ name: "All" }))

export interface All extends MO.AType<typeof All_> {}
export interface AllE extends MO.EType<typeof All_> {}
export const All = MO.opaque<AllE, All>()(All_)

it("sort the model", () => {
  const reordered = S.run(
    reorder(All).reorder({
      b: "b",
      c: "c",
      a: "a"
    })
  )

  expect(Object.keys(reordered)).toEqual(["a", "b", "c"])
})
