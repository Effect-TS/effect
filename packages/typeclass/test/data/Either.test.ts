import * as EitherInstances from "@effect/typeclass/data/Either"
import * as OptionInstances from "@effect/typeclass/data/Option"
import { describe, expect, it } from "@effect/vitest"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Util from "../util.js"

describe.concurrent("Either", () => {
  it("Foldable.reduce", () => {
    Util.deepStrictEqual(
      pipe(Either.right("bar"), EitherInstances.Foldable.reduce("foo", (b, a) => b + a)),
      "foobar"
    )
    Util.deepStrictEqual(
      pipe(Either.left("bar"), EitherInstances.Foldable.reduce("foo", (b, a) => b + a)),
      "foo"
    )
  })

  it("FlatMap.flatMap", () => {
    const f = EitherInstances.FlatMap.flatMap((s: string) => Either.right(s.length))
    Util.deepStrictEqual(pipe(Either.right("abc"), f), Either.right(3))
    Util.deepStrictEqual(pipe(Either.left("maError"), f), Either.left("maError"))
  })

  it("Traversable.traverse", () => {
    const traverse = EitherInstances.Traversable.traverse(OptionInstances.Applicative)((
      n: number
    ) => (n >= 2 ? Option.some(n) : Option.none()))
    Util.deepStrictEqual(pipe(Either.left("a"), traverse), Option.some(Either.left("a")))
    Util.deepStrictEqual(pipe(Either.right(1), traverse), Option.none())
    Util.deepStrictEqual(pipe(Either.right(3), traverse), Option.some(Either.right(3)))
  })

  it("SemiProduct.product", () => {
    const product = EitherInstances.SemiProduct.product
    Util.deepStrictEqual(product(Either.right(1), Either.right("a")), Either.right([1, "a"]))
    Util.deepStrictEqual(product(Either.right(1), Either.left("e2")), Either.left("e2"))
    Util.deepStrictEqual(product(Either.left("e1"), Either.right("a")), Either.left("e1"))
    Util.deepStrictEqual(product(Either.left("e1"), Either.left("2")), Either.left("e1"))
  })

  it("SemiProduct.productMany", () => {
    const productMany: <E, A>(
      self: Either.Either<A, E>,
      collection: Iterable<Either.Either<A, E>>
    ) => Either.Either<[A, ...Array<A>], E> = EitherInstances.SemiProduct.productMany

    Util.deepStrictEqual(productMany(Either.right(1), []), Either.right([1]))
    Util.deepStrictEqual(
      productMany(Either.right(1), [Either.right(2), Either.right(3)]),
      Either.right([1, 2, 3])
    )
    Util.deepStrictEqual(
      productMany(Either.right(1), [Either.left("e"), Either.right(3)]),
      Either.left("e")
    )
    expect(
      productMany(Either.left("e"), [Either.right(2), Either.right(3)])
    ).toEqual(Either.left("e"))
  })

  it("Product.productAll", () => {
    const productAll = EitherInstances.Product.productAll
    Util.deepStrictEqual(productAll([]), Either.right([]))
    Util.deepStrictEqual(
      productAll([Either.right(1), Either.right(2), Either.right(3)]),
      Either.right([1, 2, 3])
    )
    Util.deepStrictEqual(
      productAll([Either.left("e"), Either.right(2), Either.right(3)]),
      Either.left("e")
    )
  })

  it("SemiCoproduct.coproduct", () => {
    const coproduct = EitherInstances.SemiCoproduct.coproduct
    Util.deepStrictEqual(coproduct(Either.right(1), Either.right(2)), Either.right(1))
    Util.deepStrictEqual(coproduct(Either.right(1), Either.left("e2")), Either.right(1))
    Util.deepStrictEqual(coproduct(Either.left("e1"), Either.right(2)), Either.right(2))
    Util.deepStrictEqual(coproduct(Either.left("e1"), Either.left("e2")), Either.left("e2"))
  })

  it("SemiCoproduct.coproductMany", () => {
    const coproductMany = EitherInstances.SemiCoproduct.coproductMany
    Util.deepStrictEqual(coproductMany(Either.right(1), [Either.right(2)]), Either.right(1))
    Util.deepStrictEqual(
      coproductMany(Either.right(1), [Either.left("e2")]),
      Either.right(1)
    )
    Util.deepStrictEqual(coproductMany(Either.left("e1"), [Either.right(2)]), Either.right(2))
    Util.deepStrictEqual(coproductMany(Either.left("e1"), [Either.left("e2")]), Either.left("e2"))
  })
})
