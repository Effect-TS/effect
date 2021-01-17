import { pipe } from "@effect-ts/core/Function"
import { some } from "@effect-ts/core/Option"

import * as L from "../src/Lens"
import * as O from "../src/Optional"

interface Person {
  name: {
    first?: string
    last?: string
  }
}

describe("Lens", () => {
  it("access first", () => {
    const firstName = pipe(
      L.id<Person>(),
      L.prop("name"),
      L.asOptional,
      O.prop("first"),
      O.fromNullable
    )

    expect(
      pipe(
        <Person>{ name: { first: "Mike", last: "Arnaldi" } },
        firstName.set("Updated"),
        firstName.getOption
      )
    ).toEqual(some("Updated"))
  })
})
