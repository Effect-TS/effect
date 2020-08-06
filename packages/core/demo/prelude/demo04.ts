import { pipe } from "../../src/Function"
import * as A from "../../src/next/Prelude/Array"
import * as Equal from "../../src/next/Prelude/Equal"

const EqNumberArray = A.Equal.derive(Equal.strict<number>())

pipe(A.range(0, 10), EqNumberArray(A.range(0, 10)), (b) => {
  console.log("done", b)
})
