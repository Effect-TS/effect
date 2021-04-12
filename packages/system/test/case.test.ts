import * as Case from "../src/Case"
import * as S from "../src/Structural"

describe("Case Class", () => {
  it("should work with equal and hash", () => {
    class Person extends Case.Case<Person> {
      readonly firstName!: string
      readonly lastName!: string
    }

    const person = new Person({ firstName: "Michael", lastName: "Arnaldi" })
    const personEq = new Person({ lastName: "Arnaldi", firstName: "Michael" })
    const newPerson = person.copy({ firstName: "Mike" })

    expect(JSON.stringify(person)).toEqual(
      '{"firstName":"Michael","lastName":"Arnaldi"}'
    )
    expect(JSON.stringify(newPerson)).toEqual(
      '{"firstName":"Mike","lastName":"Arnaldi"}'
    )
    expect(Case.equals(person, newPerson)).toEqual(false)
    expect(Case.equals(person, personEq)).toEqual(true)
    expect(Case.hash(person)).toEqual(Case.hash(personEq))
    expect(Case.hash(person)).not.toEqual(Case.hash(newPerson))
  })
  it("should compare using equal", () => {
    class Key implements S.HasEquals {
      constructor(readonly k: string, readonly v: string) {}

      [S.equalsSym](u: unknown): boolean {
        return u instanceof Key && this.k === u.k
      }
    }

    class Person extends Case.Case<Person> {
      readonly key!: Key
      readonly firstName!: string
      readonly lastName!: string
    }

    const personA = new Person({
      firstName: "Michael",
      lastName: "Arnaldi",
      key: new Key("a", "b")
    })
    const personB = new Person({
      firstName: "Michael",
      lastName: "Arnaldi",
      key: new Key("a", "c")
    })
    const personC = new Person({
      firstName: "Michael",
      lastName: "Arnaldi",
      key: new Key("d", "c")
    })

    expect(Case.equals(personA, personB)).toEqual(true)
    expect(Case.equals(personA, personC)).toEqual(false)
  })
})
