import * as assert from "assert"

import * as E from "../../src/Either"
import * as I from "../../src/Model"

const Person_ = I.type({
  name: I.string
})

interface Person extends I.TypeOf<typeof Person_> {}

const Person = I.opaque<Person>()(Person_)

describe("Model", () => {
  it("Decode Person", () => {
    const decoded = Person.decode({ name: "Michael" })

    assert.deepStrictEqual(decoded, E.right({ name: "Michael" }))
  })
})
