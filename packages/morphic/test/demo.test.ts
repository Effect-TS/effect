import * as M from "../src/micro"
import { equal } from "../src/micro/Equal"

export const Person_ = M.make((F) =>
  F.array(F.string(), { conf: { [M.EqURI]: (_) => _ } })
)

export interface Person extends M.AType<typeof Person_> {}
export interface PersonE extends M.EType<typeof Person_> {}

export const Person = M.opaque<PersonE, Person>()(Person_)

export const eqPerson = equal(Person)

export const A = M.make((F) =>
  F.interface({
    a: F.string()
  })
)

export const B = M.make((F) =>
  F.interface({
    b: F.string()
  })
)

export const C = M.make((F) =>
  F.interface({
    c: F.string()
  })
)

export const all = M.make((F) =>
  F.intersection(
    A(F),
    B(F),
    C(F)
  )({
    conf: {
      [M.EqURI]: (_, __, { equals: [a, b, c] }) => {
        return _
      }
    }
  })
)
