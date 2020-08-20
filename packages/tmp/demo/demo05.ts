import * as A from "../src/Array"
import { pipe } from "../src/Function"
import { Sum } from "../src/Newtype"

const sum = A.SumClosure<number>().combine

pipe(Sum.wrap([0, 1, 2]), sum(Sum.wrap([3, 4, 5])), (ns) => {
  console.log(Sum.unwrap(ns))
})
