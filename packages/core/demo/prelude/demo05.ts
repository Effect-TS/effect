import { pipe } from "../../src/Function"
import * as A from "../../src/next/Prelude/Array"
import { Sum } from "../../src/next/Prelude/Newtype"

const sum = A.SumClosure<number>().combine

pipe(Sum.wrap([0, 1, 2]), sum(Sum.wrap([3, 4, 5])), (ns) => {
  console.log(Sum.unwrap(ns))
})
