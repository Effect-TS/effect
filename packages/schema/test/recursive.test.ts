import type * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import * as T from "@effect-ts/core/Effect"
import * as E from "@effect-ts/core/Either"

import * as S from "../src"
import * as Encoder from "../src/Encoder"
import * as Parser from "../src/Parser"

export interface Person {
  readonly id: string
  readonly friends: Chunk.Chunk<Person>
}

export interface PersonInput {
  readonly id: string
  readonly friends: Iterable<PersonInput>
}

export interface PersonEncoded {
  readonly id: string
  readonly friends: readonly PersonEncoded[]
}

const personS = S.recursive<unknown, Person, PersonInput, Person, PersonEncoded>((F) =>
  S.struct({
    required: {
      id: S.string,
      friends: S.chunk(F)
    }
  })
)

const parsePerson = Parser.for(personS)["|>"](S.condemnFail)
const encodePerson = Encoder.for(personS)

describe("Recursive", () => {
  it("parse", async () => {
    const result = await T.runPromise(
      T.either(
        parsePerson({
          id: "a",
          friends: [
            { id: "b", friends: [{ id: "d", friends: [] }] },
            { id: "c", friends: [] }
          ]
        })
      )
    )

    expect(result._tag).equals("Right")
    expect(E.map_(result, encodePerson)).toEqual(
      E.right({
        id: "a",
        friends: [
          { id: "b", friends: [{ id: "d", friends: [] }] },
          { id: "c", friends: [] }
        ]
      })
    )
  })
})
