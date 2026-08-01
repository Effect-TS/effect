import { assert, it } from "@effect/vitest"
import { ConfigProvider, Effect } from "effect"
import { OtlpResource } from "effect/unstable/observability"

it("preserves bigint attribute precision", () => {
  const input = 9_007_199_254_740_993n
  const output = OtlpResource.unknownToAttributeValue(input)

  assert.strictEqual(String(output.intValue), input.toString())
})

it.effect("decodes percent-encoded OTEL_RESOURCE_ATTRIBUTES", () =>
  Effect.gen(function*() {
    const resource = yield* OtlpResource.fromConfig()
    const attributes = Object.fromEntries(
      resource.attributes.map((attribute) => [attribute.key, attribute.value.stringValue])
    )

    assert.strictEqual(attributes.message, "hello world")
    assert.strictEqual(attributes.comma, "comma,value")
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromEnv({
        env: {
          OTEL_SERVICE_NAME: "repro",
          OTEL_RESOURCE_ATTRIBUTES: "message=hello%20world,comma=comma%2Cvalue"
        }
      })
    )
  ))
