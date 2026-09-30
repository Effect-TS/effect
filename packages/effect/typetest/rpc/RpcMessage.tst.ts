import type { RpcMessage } from "effect/rpc"
import { describe, expect, it } from "tstyche"

type EncodedReason = Extract<RpcMessage.ExitEncoded<unknown, unknown>, { readonly _tag: "Failure" }>["cause"][number]

describe("RpcMessage", () => {
  describe("ExitEncoded", () => {
    it("types the interrupt fiber id as the JSON codec encodes it", () => {
      expect<Extract<EncodedReason, { readonly _tag: "Interrupt" }>["fiberId"]>().type.toBe<number | null>()
    })

    it("accepts an encoded interrupt without a fiber id", () => {
      expect({ _tag: "Failure", cause: [{ _tag: "Interrupt", fiberId: null }] } as const)
        .type.toBeAssignableTo<RpcMessage.ExitEncoded<unknown, unknown>>()
    })
  })
})
