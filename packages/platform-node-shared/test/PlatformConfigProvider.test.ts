import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider"
import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Effect, Layer, Redacted } from "effect"

const SetLive = PlatformConfigProvider.layerFileTree({
  rootDirectory: `${__dirname}/fixtures/config`
}).pipe(
  Layer.provide(NodePath.layer),
  Layer.provide(NodeFileSystem.layer)
)

const AddLive = PlatformConfigProvider.layerFileTreeAdd({
  rootDirectory: `${__dirname}/fixtures/config`
}).pipe(
  Layer.provide(NodePath.layer),
  Layer.provide(NodeFileSystem.layer)
)

describe("PlatformConfigProvider", () => {
  it.effect("fromFileTree", () =>
    Effect.gen(function*(_) {
      assert.strictEqual(Redacted.value(yield* _(Config.redacted("secret"))), "keepitsafe")
      assert.strictEqual(yield* _(Config.string("SHOUTING")), "value")
      assert.strictEqual(yield* _(Config.integer("integer")), 123)
      assert.strictEqual(yield* _(Config.string("nested/config")), "hello")
      assert.strictEqual(yield* _(Config.string("config"), Config.nested("nested")), "hello")
      const error = yield* _(Config.string("fallback"), Effect.flip)
      assert.strictEqual(error._op, "MissingData")
    }).pipe(
      Effect.provide(SetLive),
      Effect.withConfigProvider(ConfigProvider.fromJson({
        secret: "fail"
      }))
    ))

  it.effect("layerFileTreeAdd", () =>
    Effect.gen(function*(_) {
      assert.strictEqual(Redacted.value(yield* _(Config.redacted("secret"))), "shh")
      assert.strictEqual(yield* _(Config.integer("integer")), 123)
      assert.strictEqual(yield* _(Config.string("fallback")), "value")
    }).pipe(
      Effect.provide(AddLive),
      Effect.withConfigProvider(ConfigProvider.fromJson({
        secret: "shh",
        fallback: "value"
      }))
    ))
})
