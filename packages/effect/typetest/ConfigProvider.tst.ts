import { ConfigProvider, Effect, Option } from "effect"
import { describe, expect, it } from "tstyche"

describe("ConfigProvider", () => {
  it("exposes optional lookup and input transformation", () => {
    const provider = ConfigProvider.make((_path) => Effect.succeed(Option.some(ConfigProvider.makeValue("value"))))

    expect(provider.load([]))
      .type.toBe<Effect.Effect<Option.Option<ConfigProvider.Node>, ConfigProvider.SourceError>>()
    expect(provider.mapInput((path) => path))
      .type.toBe<ConfigProvider.ConfigProvider>()
  })
})
