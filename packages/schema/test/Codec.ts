import * as C from "@fp-ts/schema/Codec"

describe.concurrent("Codec", () => {
  it("exports", () => {
    expect(C.make).exist
    expect(C.filter).exist
    expect(C.filterWith).exist
    expect(C.refine).exist
    expect(C.string).exist
    expect(C.number).exist
    expect(C.boolean).exist
    expect(C.bigint).exist
    expect(C.unknown).exist
    expect(C.any).exist
    expect(C.never).exist
    expect(C.json).exist
  })

  it("parseOrThrow", () => {
    const Person = C.struct({
      firstName: C.string,
      lastName: C.string,
      age: C.optional(C.number)
    })

    const person = Person.of({ firstName: "Michael", lastName: "Arnaldi" })
    const string = Person.stringify(person)

    expect(string).toEqual(`{"firstName":"Michael","lastName":"Arnaldi"}`)
    expect(Person.parseOrThrow(string)).toEqual(person)
  })
})
