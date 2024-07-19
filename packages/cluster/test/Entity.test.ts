import * as Entity from "@effect/cluster/Entity"
import * as Schema from "@effect/schema/Schema"
import { equals } from "effect/Equal"
import * as Hash from "effect/Hash"
import * as PrimaryKey from "effect/PrimaryKey"
import { describe, expect, it } from "vitest"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()(
  "SampleMessage",
  Schema.Never,
  Schema.Number,
  {
    id: Schema.String
  }
) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

class SampleMessage2 extends Schema.TaggedRequest<SampleMessage2>()(
  "SampleMessage2",
  Schema.Never,
  Schema.String,
  {
    id2: Schema.String
  }
) {
  [PrimaryKey.symbol]() {
    return this.id2
  }
}

describe.concurrent("Entity", () => {
  it("Expect equals to work as expected", () => {
    const User = new Entity.Standard({ name: "User", schema: SampleMessage })
    const User2 = new Entity.Standard({ name: "User", schema: SampleMessage2 })
    const Notifications = new Entity.Clustered({ name: "Notifications", schema: SampleMessage })

    expect(equals(User, User)).toBe(true)
    expect(equals(User, User2)).toBe(true)
    expect(equals(User, Notifications)).toBe(false)
  })

  it("Expect hash to work as expected", () => {
    const User = new Entity.Standard({ name: "User", schema: SampleMessage })
    const User2 = new Entity.Standard({ name: "User", schema: SampleMessage2 })
    const Notifications = new Entity.Clustered({ name: "Notifications", schema: SampleMessage })

    expect(Hash.hash(User)).toBe(Hash.hash(User))
    expect(Hash.hash(User)).toBe(Hash.hash(User2))
    expect(Hash.hash(User)).not.toBe(Hash.hash(Notifications))
  })
})
