import * as _ from "@effect/rpc/SchemaC"
import { typeEquals } from "@effect/rpc/test/utils"
import * as S from "@effect/schema/Schema"
import * as Data from "effect/Data"
import { describe, expect, it } from "vitest"

describe("SchemaC", () => {
  it("withConstructorSelf/ struct", () => {
    const User_ = _.withConstructorSelf(
      S.struct({
        name: S.string
      })
    )
    interface User extends S.Schema.To<typeof User_> {}
    const User = _.withTo<User>()(User_)

    typeEquals(User)<
      _.SchemaC<{ readonly name: string }, User, { readonly name: string }>
    >() satisfies true

    expect(User({ name: "John" })).toEqual({ name: "John" })
  })

  it("withConstructorTagged/", () => {
    const User_ = _.withConstructorTagged(
      S.struct({
        _tag: S.literal("User"),
        name: S.string
      }),
      "User"
    )
    interface User extends S.Schema.To<typeof User_> {}
    const User = _.withTo<User>()(User_)

    typeEquals(User)<
      _.SchemaC<
        { readonly _tag: "User"; readonly name: string },
        User,
        { readonly name: string }
      >
    >() satisfies true

    expect(User({ name: "John" })).toEqual({ _tag: "User", name: "John" })
  })

  it("withConstructorDataTagged/", () => {
    const User_ = _.withConstructorDataTagged(
      S.struct({
        _tag: S.literal("User"),
        name: S.string
      }),
      "User"
    )
    interface User extends S.Schema.To<typeof User_> {}
    const User = _.withTo<User>()(User_)

    typeEquals(User)<
      _.SchemaC<
        { readonly _tag: "User"; readonly name: string },
        User,
        { readonly name: string }
      >
    >() satisfies true

    expect(User({ name: "John" })).toEqual(
      Data.struct({ _tag: "User", name: "John" })
    )
  })
})
