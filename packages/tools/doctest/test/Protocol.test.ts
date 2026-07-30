import * as Protocol from "@effect/doctest/Protocol"
import { assert, describe, it } from "@effect/vitest"

describe("Protocol", () => {
  it("round-trips collector requests", () => {
    const id = Protocol.collectorId("/src/a file.ts", "version-1")

    assert.deepStrictEqual(Protocol.request(Protocol.collectorPrefix, id), {
      file: "/src/a file.ts",
      index: undefined,
      version: "version-1"
    })
  })

  it("round-trips example requests", () => {
    const id = Protocol.exampleId("/src/example.ts", 3, "version-1")

    assert.deepStrictEqual(Protocol.request(Protocol.examplePrefix, id), {
      file: "/src/example.ts",
      index: 3,
      version: "version-1"
    })
  })

  it("rejects malformed virtual requests", () => {
    for (
      const id of [
        "other:file",
        Protocol.examplePrefix,
        `${Protocol.examplePrefix}file=example.ts&index=-1`,
        `${Protocol.examplePrefix}file=example.ts&index=1.5`
      ]
    ) {
      assert.isUndefined(Protocol.request(Protocol.examplePrefix, id))
    }
  })

  it("round-trips resolved collector identifiers", () => {
    const id = Protocol.resolvedId("collector", {
      file: "/src/example.ts",
      version: "version-1"
    })

    assert.deepStrictEqual(Protocol.resolvedRequest(id), {
      file: "/src/example.ts",
      index: undefined,
      version: "version-1",
      kind: "collector"
    })
  })

  it("round-trips resolved example identifiers", () => {
    const id = Protocol.resolvedId("example", {
      file: "/src/example.ts",
      index: 2
    })

    assert.deepStrictEqual(Protocol.resolvedRequest(id), {
      file: "/src/example.ts",
      index: 2,
      version: undefined,
      kind: "example"
    })
  })

  it("rejects malformed resolved identifiers", () => {
    for (
      const id of [
        "/src/example.ts",
        "/src/example.ts?effect-doctest=unknown",
        "/src/example.ts?effect-doctest=example",
        "/src/example.ts?effect-doctest=example&index=one"
      ]
    ) {
      assert.isUndefined(Protocol.resolvedRequest(id))
    }
  })
})
