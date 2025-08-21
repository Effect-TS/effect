import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem"
import * as NodePath from "@effect/platform-node-shared/NodePath"
import * as PlatformConfigProvider from "@effect/platform/PlatformConfigProvider"
import { assert, describe, it } from "@effect/vitest"
import { Config, ConfigProvider, Effect, Layer, pipe, Redacted } from "effect"

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
    Effect.gen(function*() {
      assert.strictEqual(Redacted.value(yield* Config.redacted("secret")), "keepitsafe")
      assert.strictEqual(yield* Config.string("SHOUTING"), "value")
      assert.strictEqual(yield* Config.integer("integer"), 123)
      assert.strictEqual(yield* Config.string("nested/config"), "hello")
      assert.strictEqual(yield* pipe(Config.string("config"), Config.nested("nested")), "hello")
      const error = yield* pipe(Config.string("fallback"), Effect.flip)
      assert.strictEqual(error._op, "MissingData")
    }).pipe(
      Effect.provide(SetLive),
      Effect.withConfigProvider(ConfigProvider.fromJson({
        secret: "fail"
      }))
    ))

  it.effect("layerFileTreeAdd", () =>
    Effect.gen(function*() {
      assert.strictEqual(Redacted.value(yield* Config.redacted("secret")), "shh")
      assert.strictEqual(yield* Config.integer("integer"), 123)
      assert.strictEqual(yield* Config.string("fallback"), "value")
    }).pipe(
      Effect.provide(AddLive),
      Effect.withConfigProvider(ConfigProvider.fromJson({
        secret: "shh",
        fallback: "value"
      }))
    ))
})
