import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"

import * as MO from "../src"
import * as Guard from "../src/Guard"
import * as Parser from "../src/Parser"

export class Person extends MO.Schemed(
  pipe(
    MO.required({
      firstName: MO.string,
      lastName: MO.string
    }),
    MO.withTag("_tag", "Person")
  )
) {
  static schema = MO.schema(Person)
}

export class Animal extends MO.Schemed(
  pipe(
    MO.required({
      size: MO.literal("small", "mid")
    }),
    MO.withTag("_tag", "Animal")
  )
) {
  static schema = MO.schema(Animal)
}

const PersonOrAnimal = MO.tagged(Person.schema, Animal.schema)

const parsePerson = Parser.for(Person.schema)["|>"](MO.condemnFail)
const parsePersonOrAnimal = Parser.for(PersonOrAnimal)["|>"](MO.condemnFail)
const isPerson = Guard.for(Person.schema)

describe("Schemed", () => {
  it("construct objects", () => {
    const person = new Person({ firstName: "Mike", lastName: "Arnaldi" })
    expect(person._tag).toEqual("Person")
    expect(isPerson(person)).toEqual(true)
  })
  it("parse person", async () => {
    const person = await T.runPromise(
      parsePerson({
        _tag: "Person",
        firstName: "Mike",
        lastName: "Arnaldi"
      })
    )
    const person2 = new Person({ firstName: "Mike", lastName: "Arnaldi" })

    expect(isPerson(person)).toEqual(true)
    expect(person).equals(person2)
  })
  it("parse tagged", async () => {
    const person = await T.runPromise(
      parsePersonOrAnimal({
        _tag: "Person",
        firstName: "Mike",
        lastName: "Arnaldi"
      })
    )
    const person2 = new Person({ firstName: "Mike", lastName: "Arnaldi" })

    expect(isPerson(person)).toEqual(true)
    expect(person).equals(person2)
  })
})
