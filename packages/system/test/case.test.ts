import * as Case from "../src/Case"
import * as S from "../src/Structural"
import { LazyGetter } from "../src/Utils"

describe("Case Class", () => {
  it("should work with equal and hash", () => {
    class Person extends Case.Tagged("Person")<{
      readonly firstName: string
      readonly lastName: string
    }> {}

    const person = new Person({ firstName: "Michael", lastName: "Arnaldi" })
    const personEq = new Person({ lastName: "Arnaldi", firstName: "Michael" })
    const newPerson = person.copy({ firstName: "Mike" })

    expect(JSON.stringify(person)).toEqual(
      '{"firstName":"Michael","lastName":"Arnaldi","_tag":"Person"}'
    )
    expect(JSON.stringify(newPerson)).toEqual(
      '{"firstName":"Mike","lastName":"Arnaldi","_tag":"Person"}'
    )
    expect(person).not.equals(newPerson)
    expect(person).equals(personEq)
    expect(S.hash(person)).equals(S.hash(personEq))
    expect(S.hash(person)).not.equals(S.hash(newPerson))
  })
  it("should compare using equal", () => {
    class Key implements S.HasEquals {
      constructor(readonly k: string, readonly v: string) {}

      [S.equalsSym](u: unknown): boolean {
        return u instanceof Key && this.k === u.k
      }

      @LazyGetter()
      get [S.hashSym](): number {
        return S.hashString(this.k)
      }
    }

    class Person extends Case.Case<{
      readonly key: Key
      readonly firstName: string
      readonly lastName: string
    }> {}

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

    expect(personA).equals(personB)
    expect(personA).not.equals(personC)
  })
})
