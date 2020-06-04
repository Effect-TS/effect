import * as assert from "assert"

import { pipe } from "../../src/Function"
import * as F from "../../src/Monocle/Fold"
import * as G from "../../src/Monocle/Getter"
import * as I from "../../src/Monocle/Iso"
import * as L from "../../src/Monocle/Lens"
import * as Op from "../../src/Monocle/Optional"
import * as P from "../../src/Monocle/Prism"
import * as S from "../../src/Monocle/Setter"
import * as Tr from "../../src/Monocle/Traversal"
import * as M from "../../src/Monoid"
import * as O from "../../src/Option"

interface Name {
  first: string
  last: string
  middle?: string
}

interface Person {
  name: Name
}

describe("Lens", () => {
  it("Compose Lens", () => {
    const name = L.fromProp<Person>()("name")
    const first = L.fromProp<Name>()("first")

    const firstName = pipe(name, L.compose(first))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, L.get(firstName))

    assert.deepStrictEqual(res, "Mike")
  })
  it("Lens from path", () => {
    const firstName = L.fromPath<Person>()(["name", "first"])
    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, L.get(firstName))

    assert.deepStrictEqual(res, "Mike")
  })
  it("Lens from props", () => {
    const name = L.fromPath<Person>()(["name"])
    const full = L.fromProps<Name>()(["first", "last"])

    const fullName = pipe(name, L.compose(full))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, L.get(fullName))

    assert.deepStrictEqual(res, {
      first: "Mike",
      last: "Arnaldi"
    })
  })
  it("Lens from nullable prop", () => {
    const name = L.fromPath<Person>()(["name"])
    const middle = L.fromNullableProp<Name>()("middle", "n/a")

    const middleName = pipe(name, L.compose(middle))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }
    const person2: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi",
        middle: "ok"
      }
    }

    const res = pipe(person, L.get(middleName))
    const res2 = pipe(person2, L.get(middleName))

    assert.deepStrictEqual(res, "n/a")
    assert.deepStrictEqual(res2, "ok")
  })
  it("modify", () => {
    const firstName = L.fromPath<Person>()(["name", "first"])
    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(
      person,
      L.modify(firstName)((s) => `${s}-suffix`),
      L.get(firstName)
    )

    assert.deepStrictEqual(res, "Mike-suffix")
  })
  it("set", () => {
    const firstName = L.fromPath<Person>()(["name", "first"])
    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, L.set(firstName)("Michael"), L.get(firstName))

    assert.deepStrictEqual(res, "Michael")
  })
  it("composeOptional / asOptional", () => {
    const name = L.fromPath<Person>()(["name"])
    const first = L.fromPath<Name>()(["first"])

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const firstNameOptional = pipe(name, L.composeOptional(L.asOptional(first)))

    const res = pipe(person, Op.getOption(firstNameOptional))

    assert.deepStrictEqual(res, O.some("Mike"))
  })
  it("composeTraversal / asTraversal", () => {
    const name = L.fromPath<Person>()(["name"])
    const first = L.fromPath<Name>()(["first"])

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const firstNameTraversal = pipe(name, L.composeTraversal(L.asTraversal(first)))

    const res = pipe(
      person,
      Tr.modifyF(firstNameTraversal)(O.option)((_) => O.none)
    )

    assert.deepStrictEqual(res, O.none)
  })
  it("asSetter / composeSetter", () => {
    const name = L.fromPath<Person>()(["name"])
    const first = L.asSetter(L.fromProp<Name>()("first"))
    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const firstNameSetter = pipe(name, L.composeSetter(first))

    const res = pipe(
      person,
      S.modify(firstNameSetter)((s) => `${s}-ok`)
    )

    assert.deepStrictEqual(res, {
      name: {
        ...person.name,
        first: "Mike-ok"
      }
    })
  })
  it("composeFold / asFold", () => {
    const name = L.fromPath<Person>()(["name"])
    const first = L.fromPath<Name>()(["first"])

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const firstNameFold = pipe(name, L.composeFold(L.asFold(first)))

    const res = pipe(
      person,
      F.foldMap(firstNameFold)(M.monoidString)((s) => `${s}-ok`)
    )

    assert.deepStrictEqual(res, "Mike-ok")
  })
  it("composeGetter / asGetter", () => {
    const name = L.fromPath<Person>()(["name"])
    const first = L.asGetter(L.fromProp<Name>()("first"))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const firstNameGetter = pipe(name, L.composeGetter(first))

    const res = pipe(person, G.get(firstNameGetter))

    assert.deepStrictEqual(res, "Mike")
  })
  it("composeIso", () => {
    const name = L.create(
      (s: Person) => s.name.first,
      (first) => (s) => ({ ...s, name: { ...s.name, first } })
    )
    const firstIso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )
    const firstName = pipe(name, L.composeIso(firstIso))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, firstName.set(["M", "i"]), firstName.get)

    assert.deepStrictEqual(res, ["M", "i"])
  })
  it("composePrism", () => {
    const name = L.create(
      (s: Person) => s.name.first,
      (first) => (s) => ({ ...s, name: { ...s.name, first } })
    )
    const firstIso = P.create(
      (s: string) => O.some(s.split("")),
      (a) => a.join("")
    )
    const firstName = pipe(name, L.composePrism(firstIso))

    const person: Person = {
      name: {
        first: "Mike",
        last: "Arnaldi"
      }
    }

    const res = pipe(person, firstName.set(["M", "i"]), firstName.getOption)

    assert.deepStrictEqual(res, O.some(["M", "i"]))
  })
})
