import { Case, equals, hash } from "../src/Case"

describe("Case Class", () => {
  it("should work with equal and hash", () => {
    class Person extends Case<Person> {
      readonly firstName!: string
      readonly lastName!: string
    }

    const person = new Person({ firstName: "Michael", lastName: "Arnaldi" })
    const personEq = new Person({ firstName: "Michael", lastName: "Arnaldi" })
    const newPerson = person.copy({ firstName: "Mike" })

    expect(JSON.stringify(person)).toEqual(
      '{"firstName":"Michael","lastName":"Arnaldi"}'
    )
    expect(JSON.stringify(newPerson)).toEqual(
      '{"firstName":"Mike","lastName":"Arnaldi"}'
    )
    expect(equals(person, newPerson)).toEqual(false)
    expect(equals(person, personEq)).toEqual(true)
    expect(hash(person)).toEqual(hash(personEq))
    expect(hash(person)).not.toEqual(hash(newPerson))
  })
})
