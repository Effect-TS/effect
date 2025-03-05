import { ConfigProvider } from "effect"
import { describe, expect, it } from "tstyche"

describe("ConfigProvider", () => {
  describe("fromEnv", () => {
    it("should accept a partial configuration", () => {
      expect(ConfigProvider.fromEnv({ pathDelim: "." })).type.toBe<ConfigProvider.ConfigProvider>()
      expect(ConfigProvider.fromEnv({ seqDelim: "." })).type.toBe<ConfigProvider.ConfigProvider>()
    })
  })
})
