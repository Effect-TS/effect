import * as T from "@effect-ts/core/Effect"
import { pipe } from "@effect-ts/core/Function"
import * as FC from "fast-check"

import * as MO from "../src"
import * as Arbitrary from "../src/Arbitrary"
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
  static Model = MO.schema(Person)
}

export class Animal extends MO.Schemed(
  pipe(
    MO.required({
      size: MO.literal("small", "mid")
    }),
    MO.withTag("_tag", "Animal")
  )
) {
  static Model = MO.schema(Animal)
}

const PersonOrAnimal = MO.tagged(Person.Model, Animal.Model)

const parsePerson = Parser.for(Person.Model)["|>"](MO.condemnFail)
const parsePersonOrAnimal = Parser.for(PersonOrAnimal)["|>"](MO.condemnFail)
const isPerson = Guard.for(Person.Model)

describe("Schemed", () => {
  it("construct objects", () => {
    const person = new Person({ firstName: "Mike", lastName: "Arnaldi" })
    expect(person._tag).toEqual("Person")
    expect(isPerson(person)).toEqual(true)
    const newPerson = person.copy({ firstName: "Michael" })
    expect(newPerson).equals(new Person({ firstName: "Michael", lastName: "Arnaldi" }))
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
  it("arbitrary", () => {
    FC.check(FC.property(Arbitrary.for(Person.Model)(FC), isPerson))
  })
})
