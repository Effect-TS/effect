import * as E from "../../src/next/Prelude/Either"

const result = E.sequenceS({
  a: E.left("ok" as const),
  b: E.right(0),
  c: E.left("no" as const)
})

console.log(result)
