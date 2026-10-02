import { assert, describe, it } from "@effect/vitest"
import * as Hash from "effect/Hash"
import * as HashRing from "effect/HashRing"
import * as PrimaryKey from "effect/PrimaryKey"

describe("HashRing", () => {
  it("updates the stored node when adding the same primary key", () => {
    const first = {
      name: "first",
      [PrimaryKey.symbol]() {
        return "node"
      }
    }
    const updated = {
      name: "updated",
      [PrimaryKey.symbol]() {
        return "node"
      }
    }
    const ring = HashRing.make<typeof first>()

    HashRing.add(ring, first)
    HashRing.add(ring, updated)

    assert.strictEqual(HashRing.get(ring, "request"), updated)
  })

  it("updates the stored node when changing its weight", () => {
    const first = {
      name: "first",
      [PrimaryKey.symbol]() {
        return "node"
      }
    }
    const updated = {
      name: "updated",
      [PrimaryKey.symbol]() {
        return "node"
      }
    }
    const ring = HashRing.make<typeof first>()

    HashRing.add(ring, first)
    HashRing.add(ring, updated, { weight: 2 })

    assert.strictEqual(HashRing.get(ring, "request"), updated)
  })

  it("getShards normalizes the shard count", () => {
    const node = {
      name: "node",
      [PrimaryKey.symbol]() {
        return "node"
      }
    }
    const ring = HashRing.make<typeof node>()
    HashRing.add(ring, node)

    const shards = [Number.NaN, -1, 0, 0.5, 1.9, 2.9].map((count) => HashRing.getShards(ring, count))

    assert.deepStrictEqual(shards, [[], [], [], [], [node], [node, node]])
  })

  it("getShards considers the first ring entry when excluding allocated nodes", () => {
    // With one ring entry per node, these keys make every shard nearest to
    // `second`, so `first` at index 0 is reached only by the exclusion scan.
    const first = {
      [PrimaryKey.symbol]() {
        return "node-10"
      }
    }
    const second = {
      [PrimaryKey.symbol]() {
        return "node-29"
      }
    }
    const ring = HashRing.make<typeof first>({ baseWeight: 1 })
    HashRing.add(ring, first)
    HashRing.add(ring, second)

    assert.deepStrictEqual(HashRing.getShards(ring, 3)?.map(PrimaryKey.value), ["node-10", "node-29", "node-29"])
  })

  it("getShards does not depend on the order nodes were added or removed", () => {
    const [a, b, c, d] = ["runner-a:34431", "runner-b:34431", "runner-c:34431", "runner-d:34431"].map(makeNode)
    // Adding and removing `d` leaves a different floating-point weight total
    // than adding only `a`, `b` and `c`.
    const churned = HashRing.make<Node>()
    HashRing.add(churned, a, { weight: 0.1 })
    HashRing.add(churned, b, { weight: 0.1 })
    HashRing.add(churned, c, { weight: 0.1 })
    HashRing.add(churned, d, { weight: 0.3 })
    HashRing.remove(churned, d)
    const reversed = HashRing.make<Node>()
    HashRing.add(reversed, c, { weight: 0.1 })
    HashRing.add(reversed, b, { weight: 0.1 })
    HashRing.add(reversed, a, { weight: 0.1 })
    const fresh = HashRing.make<Node>()
    HashRing.addMany(fresh, [a, b, c], { weight: 0.1 })

    const expected = HashRing.getShards(fresh, 300)?.map(PrimaryKey.value)
    assert.deepStrictEqual(HashRing.getShards(churned, 300)?.map(PrimaryKey.value), expected)
    assert.deepStrictEqual(HashRing.getShards(reversed, 300)?.map(PrimaryKey.value), expected)
  })

  it("getShards breaks ring hash ties independently of insertion order", () => {
    const first = makeNode("runner-27:34431")
    const second = makeNode("runner-1176:34431")
    // These virtual points of different nodes have the same hash.
    assert.strictEqual(Hash.string("runner-27:34431:13"), Hash.string("runner-1176:34431:71"))
    const ring = HashRing.make<Node>()
    HashRing.add(ring, first)
    HashRing.add(ring, second)
    const swapped = HashRing.make<Node>()
    HashRing.add(swapped, second)
    HashRing.add(swapped, first)

    assert.deepStrictEqual(
      HashRing.getShards(swapped, 300)?.map(PrimaryKey.value),
      HashRing.getShards(ring, 300)?.map(PrimaryKey.value)
    )
  })

  it("getShards keeps the assignment for integer weights", () => {
    const ring = HashRing.make<Node>()
    const weights = [1, 1, 2, 1, 3]
    weights.forEach((weight, i) => HashRing.add(ring, makeNode(`runner-${i}:34431`), { weight }))

    // Pinned so that runners on different versions agree during a rolling
    // deploy. Each character is the index of the runner owning that shard.
    assert.strictEqual(
      HashRing.getShards(ring, 300)?.map((node) => PrimaryKey.value(node).slice(7, 8)).join(""),
      "430224041424144043123444044320442244121424131444021030123242231241242123343223212200442423342444044220031203434224302444432040424433312432423242440042432423423424141440204042141241144412144014124442220241424224110332244422140222224404212144414010444443431434000441303414441324440434242204240202424434"
    )
  })
})

interface Node extends PrimaryKey.PrimaryKey {}

const makeNode = (key: string): Node => ({
  [PrimaryKey.symbol]() {
    return key
  }
})
