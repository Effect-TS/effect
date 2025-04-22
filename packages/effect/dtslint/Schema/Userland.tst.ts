import { Schema as S } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema Userland", () => {
  it("goal: pass a Schema Class as a parameter to a function", () => {
    // Discord: https://discordapp.com/channels/795981131316985866/847382157861060618/1268580485412556883

    class Person extends S.Class<Person>("Person")({
      id: S.Number,
      name: S.String.pipe(S.nonEmptyString())
    }) {
      static create(id: number): Person {
        return new Person({ id, name: "<anonymous>" })
      }
      update(id: number): Person {
        return new Person({ id, name: this.name })
      }
    }

    type ModelProto = { update(id: number): Person }
    type ModelStatics = { create(id: number): Person }
    type Model<
      Self,
      Fields extends S.Struct.Fields
    > =
      & S.Class<
        Self,
        Fields,
        S.Struct.Encoded<Fields>,
        S.Struct.Context<Fields>,
        S.Struct.Constructor<Fields>,
        ModelProto,
        {}
      >
      & ModelStatics

    function f1<Self, Fields extends S.Struct.Fields>(clazz: Model<Self, Fields>) {
      return clazz.create(2).update(3)
    }

    expect(f1(Person)).type.toBe<Person>()
  })
})
