import * as Equal from "../src/_abstract/Equal"
import * as A from "../src/Array"
import { pipe } from "../src/Function"

const EqNumberArray = A.DeriveEqual.derive(Equal.strict<number>())

pipe(A.range(0, 10), EqNumberArray.equals(A.range(0, 10)), (b) => {
  console.log("done", b)
})
