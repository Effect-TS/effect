import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative/index.js"
import * as T from "../../src/Effect/index.js"
import * as E from "../../src/Either"
import * as DSL from "../../src/PreludeV2/DSL/index.js"

test("08", async () => {
  const ValidationApplicative = T.getValidationApplicative(
    makeAssociative<string>((l, r) => `${l} | ${r}`)
  )

  const structValidation = DSL.structF(ValidationApplicative)

  const effect: T.Effect<
    { foo: string } & { bar: string },
    string,
    { a: number; b: number; c: number; d: never; e: never; f: number; g: number }
  > = structValidation({
    a: T.succeed(0),
    b: T.succeed(1),
    c: T.succeed(2),
    d: T.fail("d"),
    e: T.fail("e"),
    f: T.access((_: { foo: string }) => 3),
    g: T.access((_: { bar: string }) => 3)
  })

  const result: E.Either<
    string,
    { a: number; b: number; c: number; d: never; e: never; f: number; g: number }
  > = await pipe(
    effect,
    T.either,
    T.provideAll({
      foo: "foo",
      bar: "bar"
    }),
    T.runPromise
  )
  expect(result).toEqual(E.left("e | d"))
})
