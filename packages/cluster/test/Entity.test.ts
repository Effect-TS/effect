import * as Entity from "@effect/cluster/Entity"
import * as Schema from "@effect/schema/Schema"
import { equals } from "effect/Equal"
import * as Hash from "effect/Hash"
import { describe, expect, it } from "vitest"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()(
  "SampleMessage",
  Schema.Never,
  Schema.Number,
  {
    id: Schema.String
  }
) {
}

class SampleMessage2 extends Schema.TaggedRequest<SampleMessage2>()(
  "SampleMessage2",
  Schema.Never,
  Schema.String,
  {
    id2: Schema.String
  }
) {
}

describe.concurrent("Entity", () => {
  it("Expect equals to work as expected", () => {
    const User = new Entity.Standard({ name: "User", schema: SampleMessage, messageId: (_) => _.id })
    const User2 = new Entity.Standard({ name: "User", schema: SampleMessage2, messageId: (_) => _.id2 })
    const Notifications = new Entity.Clustered({ name: "Notifications", schema: SampleMessage, messageId: (_) => _.id })

    expect(equals(User, User)).toBe(true)
    expect(equals(User, User2)).toBe(true)
    expect(equals(User, Notifications)).toBe(false)
  })

  it("Expect hash to work as expected", () => {
    const User = new Entity.Standard({ name: "User", schema: SampleMessage, messageId: (_) => _.id })
    const User2 = new Entity.Standard({ name: "User", schema: SampleMessage2, messageId: (_) => _.id2 })
    const Notifications = new Entity.Clustered({ name: "Notifications", schema: SampleMessage, messageId: (_) => _.id })

    expect(Hash.hash(User)).toBe(Hash.hash(User))
    expect(Hash.hash(User)).toBe(Hash.hash(User2))
    expect(Hash.hash(User)).not.toBe(Hash.hash(Notifications))
  })
})
