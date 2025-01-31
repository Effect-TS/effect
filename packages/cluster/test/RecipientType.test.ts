import * as Message from "@effect/cluster/Message"
import * as RecipientType from "@effect/cluster/RecipientType"
import { describe, expect, it } from "@effect/vitest"
import { equals } from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"

class Sample extends Message.TaggedMessage<Sample>()("Sample", Schema.Never, Schema.Number, {
  id: Schema.String
}, (_) => _.id) {
}

class Sample2 extends Message.TaggedMessage<Sample2>()("Sample2", Schema.Never, Schema.String, {
  id2: Schema.String
}, (_) => _.id2) {
}

describe.concurrent("RecipientType", () => {
  it("Expect equals to work as expected", () => {
    const User = RecipientType.makeEntityType("User", Sample)
    const User2 = RecipientType.makeEntityType("User", Sample2)
    const Notifications = RecipientType.makeTopicType("Notifications", Sample)

    expect(equals(User, User)).toBe(true)
    expect(equals(User, User2)).toBe(true)
    expect(equals(User, Notifications)).toBe(false)
  })

  it("Expect hash to work as expected", () => {
    const User = RecipientType.makeEntityType("User", Sample)
    const User2 = RecipientType.makeEntityType("User", Sample2)
    const Notifications = RecipientType.makeTopicType("Notifications", Sample)

    expect(Hash.hash(User)).toBe(Hash.hash(User))
    expect(Hash.hash(User)).toBe(Hash.hash(User2))
    expect(Hash.hash(User)).not.toBe(Hash.hash(Notifications))
  })
})
