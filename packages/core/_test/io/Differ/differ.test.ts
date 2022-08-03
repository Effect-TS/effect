import { diffLaws } from "@effect/core/test/io/Differ/test-utils"

const smallInt = Gen.int({ min: 0, max: 100 })

describe.concurrent("Differ", () => {
  describe.concurrent("chunk", () => {
    diffLaws(
      Differ.chunk<number, (n: number) => number>(Differ.update()),
      Gen.chunkOf(smallInt),
      Equals.equals
    )
  })

  describe.concurrent("either", () => {
    diffLaws(
      Differ.update<number>().orElseEither(Differ.update<number>()),
      Gen.either(smallInt, smallInt),
      Equals.equals
    )
  })

  // describe.concurrent("hashMap", () => {
  //   diffLaws(
  //     Differ.hashMap<number, number, (n: number) => number>(Differ.update<number>()),
  //     Gen.mapOf(smallInt, smallInt),
  //     Equals.equals
  //   )
  // })

  describe.concurrent("hashSet", () => {
    diffLaws(
      Differ.hashSet<number>(),
      Gen.setOf(smallInt),
      Equals.equals
    )
  })

  describe.concurrent("tuple", () => {
    diffLaws(
      Differ.update<number>().zip(Differ.update<number>()),
      smallInt.zip(smallInt),
      Equals.equals
    )
  })
})
