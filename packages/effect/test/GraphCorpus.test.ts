import { assert, describe, it } from "@effect/vitest"
import * as Graph from "effect/Graph"
import {
  fingerprintGraphSpec,
  graphCorpus,
  graphSizes,
  makeGraphFixture,
  makeGraphSpec,
  makePrng,
  validateGraphSpec
} from "../runtimeperf/suites/graph/fixtures/corpus.ts"
import { adaptGraphSpec } from "../runtimeperf/suites/graph/fixtures/effect.ts"

describe("Graph corpus", () => {
  it("pins the local PRNG output", () => {
    const random = makePrng(0x12345678)
    assert.deepStrictEqual(Array.from({ length: 6 }, () => random()), [
      455919406,
      4042750857,
      4036713555,
      1004527575,
      3885174651,
      3342903291
    ])
  })

  it("generates exact-size valid deterministic shapes", () => {
    assert.deepStrictEqual(
      Array.from(new Set(graphCorpus.map((fixture) => fixture.shape))).sort(),
      [
        "chain",
        "churnedSparse",
        "dense",
        "disconnected",
        "grid",
        "layeredDag",
        "loopHeavy",
        "parallelChain",
        "starIn",
        "starOut"
      ]
    )
    for (const fixture of graphCorpus) {
      validateGraphSpec(fixture.spec)
      assert.strictEqual(fixture.spec.nodeCount, graphSizes.tiny, fixture.spec.name)
      const replay = makeGraphFixture({
        shape: fixture.shape,
        size: fixture.size,
        seed: fixture.spec.seed,
        kind: fixture.spec.kind
      })
      assert.deepStrictEqual(replay, fixture, fixture.spec.name)
    }

    for (const nodeCount of [0, 1, 2, 7, 10]) {
      const grid = makeGraphSpec({ shape: "grid", nodeCount, seed: 7, kind: "directed" })
      assert.strictEqual(grid.nodeCount, nodeCount)
      assert.ok(grid.edges.every(([source, target]) => source < nodeCount && target < nodeCount))
    }
  })

  it("keeps simple and rich fixture domains explicit", () => {
    for (const fixture of graphCorpus) {
      const pairs = new Set<string>()
      for (const [source, target] of fixture.spec.edges) {
        const pair = fixture.spec.kind === "undirected" && source > target
          ? `${target}:${source}`
          : `${source}:${target}`
        if (fixture.family === "oracleSimple") {
          assert.notStrictEqual(source, target, fixture.spec.name)
          assert.ok(!pairs.has(pair), fixture.spec.name)
        }
        pairs.add(pair)
      }
      if (fixture.family === "effectRich") {
        assert.ok(
          fixture.shape === "churnedSparse" || fixture.spec.edges.some(([source, target]) => source === target) ||
            pairs.size < fixture.spec.edges.length,
          fixture.spec.name
        )
      }
    }
  })

  it("pins canonical fingerprints", () => {
    const spec = makeGraphSpec({
      shape: "layeredDag",
      nodeCount: 10,
      seed: 13,
      kind: "directed",
      name: "fingerprint-golden"
    })
    assert.strictEqual(
      fingerprintGraphSpec(spec),
      "1d446ec801850c2694b94ae971989b6311b4955440dbf77ad3624fff8735d2c2"
    )
    assert.notStrictEqual(fingerprintGraphSpec({ ...spec, seed: 14 }), fingerprintGraphSpec(spec))
  })

  it("preserves insertion order and ordinal mappings", () => {
    const fixture = makeGraphFixture({ shape: "parallelChain", size: "tiny", seed: 21, kind: "directed" })
    const adapted = adaptGraphSpec(fixture.spec, fixture.adapterRecipe)
    assert.deepStrictEqual(adapted.nodeIndices, Array.from({ length: fixture.spec.nodeCount }, (_, index) => index))
    assert.deepStrictEqual(adapted.edgeIndices, fixture.spec.edges.map((edge) => edge[3]))
    assert.deepStrictEqual(
      Array.from(adapted.graph),
      adapted.nodeIndices.map((index, ordinal) => [index, ordinal] as const)
    )
    assert.deepStrictEqual(
      Array.from(Graph.edges(adapted.graph)),
      fixture.spec.edges.map(([source, target, weight, id], ordinal) => [
        adapted.edgeIndices[ordinal],
        {
          source: adapted.nodeIndices[source],
          target: adapted.nodeIndices[target],
          data: { id, weight }
        }
      ])
    )
  })

  it("applies sparse churn through an explicit adapter recipe", () => {
    const fixture = makeGraphFixture({ shape: "churnedSparse", size: "tiny", seed: 34, kind: "undirected" })
    const adapted = adaptGraphSpec(fixture.spec, fixture.adapterRecipe)
    assert.ok(fixture.adapterRecipe.nodeIndexHoles.length > 0)
    assert.ok(fixture.adapterRecipe.edgeIndexHoles.length > 0)
    const activeIndices = (activeCount: number, holes: ReadonlyArray<number>): ReadonlyArray<number> =>
      Array.from({ length: activeCount + holes.length }, (_, index) => index).filter((index) => !holes.includes(index))
    assert.deepStrictEqual(
      adapted.nodeIndices,
      activeIndices(fixture.spec.nodeCount, fixture.adapterRecipe.nodeIndexHoles)
    )
    assert.deepStrictEqual(
      adapted.edgeIndices,
      activeIndices(fixture.spec.edges.length, fixture.adapterRecipe.edgeIndexHoles)
    )
    assert.deepStrictEqual(Array.from(Graph.indices(Graph.nodes(adapted.graph))), adapted.nodeIndices)
    assert.deepStrictEqual(Array.from(Graph.indices(Graph.edges(adapted.graph))), adapted.edgeIndices)
  })
})
