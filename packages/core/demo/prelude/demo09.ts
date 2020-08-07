import * as E from "../../src/next/Prelude/Either"
import { sequenceSF } from "../../src/next/Prelude/abstract/Applicative"

const result = sequenceSF(E.Applicative)({
  a: E.left("ok" as const),
  b: E.right(0),
  c: E.left("no" as const)
})

console.log(result)
