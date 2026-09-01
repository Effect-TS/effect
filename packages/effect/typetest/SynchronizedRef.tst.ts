import { Ref, type SynchronizedRef } from "effect"
import { describe, expect, it } from "tstyche"

declare const synchronizedRef: SynchronizedRef.SynchronizedRef<number>

describe("SynchronizedRef", () => {
  it("is not assignable to Ref", () => {
    expect(synchronizedRef).type.not.toBeAssignableTo<Ref.Ref<number>>()
    expect(Ref.get).type.not.toBeCallableWith(synchronizedRef)
  })
})
