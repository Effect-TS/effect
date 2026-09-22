import { assert, describe, it } from "@effect/vitest"
import { Chunk, Equal, Graph, Hash, HashMap, HashSet, Trie } from "effect"

const range = (length: number): ReadonlyArray<number> => Array.from({ length }, (_, index) => index)

const grid = <A>(size: number, make: (i: number, j: number) => A): ReadonlyArray<A> => {
  const values = new Array<A>(size * size)
  let index = 0
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      values[index++] = make(i, j)
    }
  }
  return values
}

const unorderedPairs = <A>(size: number, make: (i: number, j: number) => A): ReadonlyArray<A> => {
  const values = new Array<A>((size * (size - 1)) / 2)
  let index = 0
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      values[index++] = make(i, j)
    }
  }
  return values
}

const permutations = <A>(values: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> => {
  const output: Array<ReadonlyArray<A>> = []
  const visit = (prefix: ReadonlyArray<A>, remaining: ReadonlyArray<A>): void => {
    if (remaining.length === 0) {
      output.push(prefix)
      return
    }
    for (let i = 0; i < remaining.length; i++) {
      visit([...prefix, remaining[i]], [...remaining.slice(0, i), ...remaining.slice(i + 1)])
    }
  }
  visit([], values)
  return output
}

const assertNoHashCollisions = (values: Iterable<unknown>): void => {
  const hashes = new Set<number>()
  let count = 0
  for (const value of values) {
    hashes.add(Hash.hash(value))
    count++
  }
  assert.strictEqual(hashes.size, count)
}

const twoNodeGraph = (type: Graph.Kind, first: number, second: number) =>
  Graph.make(type)<number, number>((mutable) => {
    Graph.addNode(mutable, first)
    Graph.addNode(mutable, second)
    Graph.addEdge(mutable, 0, 1, 0)
  })

describe("Hash", () => {
  describe("collision resistance", () => {
    it("does not collide for a 100 by 100 grid of arrays", () => {
      assertNoHashCollisions(grid(100, (i, j) => [i, j]))
    })

    it("does not collide for a 100 by 100 grid of records", () => {
      assertNoHashCollisions(grid(100, (i, j) => ({ i, j })))
    })

    it("does not collide for a 100 by 100 grid of combined hashes", () => {
      assertNoHashCollisions(grid(100, (i, j) => Hash.combine(Hash.hash(i), Hash.hash(j))))
    })

    it("does not collide for a 100 by 100 grid of HashMap entries", () => {
      assertNoHashCollisions(grid(100, (i, j) => HashMap.make([i, j])))
    })

    it("does not collide for a 100 by 100 grid of Trie entries", () => {
      assertNoHashCollisions(grid(100, (i, j) => Trie.make([String(i), j])))
    })

    it("does not collide for a 100 by 100 grid of Chunks", () => {
      assertNoHashCollisions(grid(100, (i, j) => Chunk.make(i, j)))
    })

    it("does not collide for native Sets of pairs below 150", () => {
      assertNoHashCollisions(unorderedPairs(150, (i, j) => new Set([i, j])))
    })

    it("does not collide for HashSets of pairs below 150", () => {
      assertNoHashCollisions(unorderedPairs(150, (i, j) => HashSet.make(i, j)))
    })

    it("does not give distinct HashSets one constant hash", () => {
      assert.notStrictEqual(Hash.hash(HashSet.make(1)), Hash.hash(HashSet.make(2)))
    })

    it("does not collide for every permutation of seven integers", () => {
      assertNoHashCollisions(permutations(range(7)))
    })

    it("does not collide for nested arrays and records", () => {
      const values = []
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          for (let k = 0; k < 10; k++) {
            values.push({ a: [i, j], b: { c: k } })
          }
        }
      }
      assertNoHashCollisions(values)
    })

    it("does not collide for a 100 by 100 grid of directed two-node graphs", () => {
      assertNoHashCollisions(grid(100, (i, j) => twoNodeGraph("directed", i, j)))
    })

    it("does not collide for a 100 by 100 grid of undirected two-node graphs", () => {
      assertNoHashCollisions(grid(100, (i, j) => twoNodeGraph("undirected", i, j)))
    })

    it("keeps array order and length in the hash", () => {
      assert.notStrictEqual(Hash.hash([1, 2]), Hash.hash([2, 1]))
      assert.notStrictEqual(Hash.hash([1, 2, 3]), Hash.hash([]))
    })

    it("does not hash null, undefined, booleans and symbols like their names", () => {
      for (const value of [null, undefined, true, false, Symbol.for("a")]) {
        assert.notStrictEqual(Hash.hash(value), Hash.hash(String(value)))
      }
    })

    it("does not collide for 10k multiples of 0.1", () => {
      assertNoHashCollisions(range(10_000).map((i) => i * 0.1))
    })

    it("does not collide for 10k multiples of 0.001", () => {
      assertNoHashCollisions(range(10_000).map((i) => i * 0.001))
    })
  })

  describe("floats", () => {
    it("hashes 0 and -0 the same", () => {
      assert.strictEqual(Hash.hash(0), Hash.hash(-0))
    })

    it("hashes every NaN the same", () => {
      const bytes = new Uint32Array(2)
      const view = new Float64Array(bytes.buffer)
      bytes[0] = 1
      bytes[1] = 0x7ff80000
      const quietPayload = view[0]
      bytes[0] = 0
      bytes[1] = 0xfff00001
      const signalingNegative = view[0]
      assert.isNaN(quietPayload)
      assert.isNaN(signalingNegative)
      assert.strictEqual(Hash.hash(NaN), Hash.hash(0 / 0))
      assert.strictEqual(Hash.hash(NaN), Hash.hash(quietPayload))
      assert.strictEqual(Hash.hash(NaN), Hash.hash(signalingNegative))
      assert.notStrictEqual(Hash.hash(Infinity), Hash.hash(-Infinity))
    })
  })

  describe("hash law", () => {
    let seed = 1
    const random = (n: number): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
      return (seed >>> 16) % n
    }
    const randomKey = (): unknown => [random(60), `k${random(60)}`, [random(4), random(4)]][random(3)]
    const shuffle = <A>(values: ReadonlyArray<A>): Array<A> => {
      const output = [...values]
      for (let i = output.length - 1; i > 0; i--) {
        const j = random(i + 1)
        ;[output[i], output[j]] = [output[j], output[i]]
      }
      return output
    }

    it("hashes HashMaps and HashSets independently of insertion order", () => {
      for (let run = 0; run < 200; run++) {
        const keys = Array.from(new Set(range(1 + random(80)).map(() => random(1000))))
        const entries = keys.map((key) => [key, random(3)] as const)
        const reordered = shuffle(entries)
        assert.strictEqual(Hash.hash(HashMap.fromIterable(entries)), Hash.hash(HashMap.fromIterable(reordered)))
        assert.strictEqual(Hash.hash(HashSet.fromIterable(keys)), Hash.hash(HashSet.fromIterable(shuffle(keys))))
      }
    })

    it("hashes a Chunk independently of how it was built", () => {
      const grouped = (values: ReadonlyArray<unknown>): Chunk.Chunk<unknown> => {
        if (values.length <= 2) return Chunk.fromIterable(values)
        const cut = 1 + random(values.length - 1)
        return Chunk.appendAll(grouped(values.slice(0, cut)), grouped(values.slice(cut)))
      }
      for (let run = 0; run < 300; run++) {
        const values = range(random(60)).map(randomKey)
        const flat = Chunk.fromIterable(values)
        const from = random(values.length + 1)
        const to = from + random(values.length - from + 1)
        const slice = Chunk.fromIterable(values.slice(from, to))
        const variants = [
          [values.reduce<Chunk.Chunk<unknown>>(Chunk.append, Chunk.empty()), flat],
          [
            values.reduceRight<Chunk.Chunk<unknown>>((chunk, value) => Chunk.prepend(chunk, value), Chunk.empty()),
            flat
          ],
          [grouped(values), flat],
          [Chunk.drop(Chunk.take(Chunk.fromIterable(["first", ...values, "last"]), values.length + 1), 1), flat],
          [Chunk.take(Chunk.drop(grouped(values), from), to - from), slice],
          [Chunk.drop(Chunk.take(grouped(values), to), from), slice]
        ] as const
        for (const [chunk, expected] of variants) {
          assert.isTrue(Equal.equals(chunk, expected))
          assert.strictEqual(Hash.hash(chunk), Hash.hash(expected))
        }
      }
    })

    it("hashes a HashMap like a fresh build after persistent and in-place edits", () => {
      for (let run = 0; run < 100; run++) {
        let map = HashMap.empty<unknown, number>()
        for (let step = 0; step < 40; step++) {
          const operation = random(3)
          if (operation === 0) {
            map = HashMap.mutate(map, (mutable) => {
              for (let i = random(20); i >= 0; i--) {
                if (random(3) === 0) HashMap.remove(mutable, randomKey())
                else HashMap.set(mutable, randomKey(), random(3))
                // Hashes the nodes mid-session, before they are edited again.
                if (random(4) === 0) mutable[Hash.symbol]()
              }
            })
          } else if (operation === 1) {
            map = HashMap.remove(map, randomKey())
          } else {
            map = HashMap.set(map, randomKey(), random(3))
          }
          const rebuilt = HashMap.fromIterable(shuffle(Array.from(map)))
          assert.isTrue(Equal.equals(map, rebuilt))
          assert.strictEqual(Hash.hash(map), Hash.hash(rebuilt))
        }
      }
    })
  })

  describe("cyclic values", () => {
    it("does not cache a hash computed from a circular sentinel", () => {
      interface Node {
        next?: Node
      }
      const a1: Node = {}
      const b1: Node = {}
      a1.next = b1
      b1.next = a1

      const a2: Node = {}
      const b2: Node = {}
      a2.next = b2
      b2.next = a2

      Hash.hash(b2)
      assert.strictEqual(Hash.hash(a1), Hash.hash(a2))
    })

    it("does not cache a HashMap subtree hash computed from a circular sentinel", () => {
      const make = () => {
        const holder: { map?: unknown; tag: number } = { tag: 1 }
        const map = HashMap.make(["inner", { holder }])
        holder.map = map
        return { holder, map }
      }
      const first = make()
      const second = make()
      Hash.hash(first.map)
      assert.strictEqual(Hash.hash(first.holder), Hash.hash(second.holder))
    })

    it("does not cache a Chunk hash computed from a circular sentinel", () => {
      const make = () => {
        const holder: { chunk?: unknown; tag: number } = { tag: 1 }
        const chunk = Chunk.make({ holder })
        holder.chunk = chunk
        return { holder, chunk }
      }
      const first = make()
      const second = make()
      Hash.hash(first.chunk)
      assert.strictEqual(Hash.hash(first.holder), Hash.hash(second.holder))
    })

    it("clears visited state when a custom hasher throws", () => {
      const value = {
        [Hash.symbol](): number {
          throw new Error("boom")
        }
      }

      assert.throws(() => Hash.hash(value), /boom/)
      assert.throws(() => Hash.hash(value), /boom/)
    })
  })
})
