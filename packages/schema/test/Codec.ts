import * as _ from "@fp-ts/schema/Codec"

describe("Codec", () => {
  it("exports", () => {
    expect(_.make).exist
    expect(_.filter).exist
    expect(_.filterWith).exist
    expect(_.refine).exist
    expect(_.string).exist
    expect(_.number).exist
    expect(_.boolean).exist
    expect(_.bigint).exist
    expect(_.unknown).exist
    expect(_.any).exist
    expect(_.never).exist
    expect(_.json).exist
  })

  it("parseOrThrow", () => {
    const Person = _.struct({
      firstName: _.string,
      lastName: _.string
    }, {
      age: _.number
    })

    const person = Person.of({ firstName: "Michael", lastName: "Arnaldi" })
    const string = Person.stringify(person)

    expect(string).toEqual(`{"firstName":"Michael","lastName":"Arnaldi"}`)
    expect(Person.parseOrThrow(string)).toEqual(person)
  })
})
