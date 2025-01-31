import * as RecipientAddress from "@effect/cluster/RecipientAddress"
import { describe, expect, it } from "@effect/vitest"
import { equals } from "effect/Equal"
import * as Hash from "effect/Hash"

describe.concurrent("RecipientAddress", () => {
  it("Expect equals to work as expected", () => {
    const User = RecipientAddress.makeRecipientAddress("User", "1")
    const User2 = RecipientAddress.makeRecipientAddress("User", "1")
    const Notifications = RecipientAddress.makeRecipientAddress("Notifications", "2")

    expect(equals(User, User)).toBe(true)
    expect(equals(User, User2)).toBe(true)
    expect(equals(User, Notifications)).toBe(false)
  })

  it("Expect hash to work as expected", () => {
    const User = RecipientAddress.makeRecipientAddress("User", "1")
    const User2 = RecipientAddress.makeRecipientAddress("User", "1")
    const Notifications = RecipientAddress.makeRecipientAddress("Notifications", "2")

    expect(Hash.hash(User)).toBe(Hash.hash(User))
    expect(Hash.hash(User)).toBe(Hash.hash(User2))
    expect(Hash.hash(User)).not.toBe(Hash.hash(Notifications))
  })
})
