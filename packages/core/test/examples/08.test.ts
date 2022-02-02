import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../../src/Associative"
import * as T from "../../src/Effect"
import * as DSL from "../../src/Prelude/DSL"

test("08", async () => {
  const ValidationApplicative = T.getValidationApplicative(
    makeAssociative<string>((l, r) => `${l} | ${r}`)
  )

  const structValidation = DSL.structF(ValidationApplicative)

  const result = structValidation({
    a: T.succeed(0),
    b: T.succeed(1),
    c: T.succeed(2),
    d: T.fail("d"),
    e: T.fail("e"),
    f: T.access((_: { foo: string }) => 3),
    g: T.access((_: { bar: string }) => 3)
  })

  await pipe(
    result,
    T.either,
    T.chain((e) =>
      T.succeedWith(() => {
        console.log(e)
      })
    ),
    T.provideAll({
      foo: "foo",
      bar: "bar"
    }),
    T.runPromise
  )
})
