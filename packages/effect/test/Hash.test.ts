import { assert } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import { getAllObjectKeys } from "effect/internal/equal"
import { entriesHash } from "effect/internal/hashMap"
import * as Trie from "effect/Trie"
import { describe, it } from "vitest"

// Deterministic PRNG so failures are reproducible from the printed seed.
const mulberry32 = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// The composition primitives, restated from their specification (MurmurHash3's
// `fmix32` and block scramble), so the reference model is independent of the
// implementation's internals.
const mix = (h: number) => {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return h ^ (h >>> 16)
}
const rotl = (x: number, r: number) => (x << r) | (x >>> (32 - r))
const scramble = (k: number) => Math.imul(rotl(Math.imul(k, 0xcc9e2d51), 15), 0x1b873593)
const entryTerm = (key: number, value: number) => mix(key ^ scramble(value))
const protoMemberHash = Hash.optimize(mix(7))
const hasOwn = (o: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(o, key)

// Reference model written directly from the specification: collect keys with
// `getAllObjectKeys`, resolve each key along the chain, and hash its value,
// except that prototype data members holding functions or objects contribute
// a fixed tag. The optimized implementation must agree with it exactly.
const memberHash = (o: object, key: PropertyKey): number => {
  if (!hasOwn(o, key)) {
    for (let p = Object.getPrototypeOf(o); p !== null; p = Object.getPrototypeOf(p)) {
      if (!hasOwn(p, key)) continue
      const descriptor = Object.getOwnPropertyDescriptor(p, key)!
      const value = descriptor.value
      if (
        "value" in descriptor && key !== "constructor" && key !== "stack" &&
        (typeof value === "function" || (typeof value === "object" && value !== null))
      ) {
        return protoMemberHash
      }
      break
    }
  }
  return Hash.hash((o as any)[key])
}

const reference = (o: object): number => {
  let h = 12289
  for (const key of getAllObjectKeys(o)) {
    h ^= entryTerm(Hash.hash(key), memberHash(o, key))
  }
  return Hash.optimize(h)
}

const symA = Symbol("a")
const symB = Symbol.for("effect/test/b")
const keyPool: ReadonlyArray<PropertyKey> = ["a", "b", "c", "m", "n", symA, symB, "constructor", "stack"]

const makeRandom = (seed: number) => {
  const random = mulberry32(seed)
  const int = (n: number) => Math.floor(random() * n)
  const pick = <A>(values: ReadonlyArray<A>): A => values[int(values.length)]
  const primitive = () => pick<unknown>([int(100), `s${int(10)}`, true, false, null, undefined, 1.5])
  return { random, int, pick, primitive }
}

type Gen = ReturnType<typeof makeRandom>

const defineMember = (gen: Gen, target: object, key: PropertyKey) => {
  const enumerable = gen.random() < 0.7
  switch (gen.int(5)) {
    case 0:
      return Object.defineProperty(target, key, { value: gen.primitive(), enumerable, configurable: true })
    case 1:
      return Object.defineProperty(target, key, { value: function method() {}, enumerable, configurable: true })
    case 2:
      return Object.defineProperty(target, key, { value: { x: gen.int(3) }, enumerable, configurable: true })
    case 3: {
      // Getters read `a`, and a getter on `a` reads nothing, so getters can
      // never recurse into each other.
      return Object.defineProperty(target, key, {
        get(this: any) {
          return key === "a" ? "terminal" : this.a ?? "missing"
        },
        enumerable,
        configurable: true
      })
    }
    default: {
      const value = gen.primitive()
      return Object.defineProperty(target, key, {
        get: () => value,
        enumerable,
        configurable: true
      })
    }
  }
}

const makeChain = (gen: Gen): object => {
  let proto: object = gen.random() < 0.2 ? Error.prototype : Object.prototype
  const depth = 1 + gen.int(3)
  for (let level = 0; level < depth; level++) {
    const next = Object.create(proto)
    const count = gen.int(4)
    for (let i = 0; i < count; i++) {
      defineMember(gen, next, gen.pick(keyPool))
    }
    if (gen.random() < 0.5) {
      // A conventional constructor whose `prototype` points back at `next`.
      const ctor = function Ctor() {}
      ctor.prototype = next
      Object.defineProperty(next, "constructor", { value: ctor, enumerable: false, configurable: true })
    }
    proto = next
  }
  return proto
}

const makeInstance = (gen: Gen, proto: object): object => {
  const instance = Object.create(proto)
  const count = gen.int(5)
  for (let i = 0; i < count; i++) {
    const key = gen.pick(keyPool)
    if (key === "constructor" && gen.random() < 0.7) continue
    if (gen.random() < 0.8) {
      Object.defineProperty(instance, key, {
        value: gen.primitive(),
        enumerable: gen.random() < 0.8,
        configurable: true,
        writable: true
      })
    } else {
      defineMember(gen, instance, key)
    }
  }
  return instance
}

describe("Hash", () => {
  describe("structural hashing", () => {
    it("agrees with the reference model on random prototype chains", () => {
      for (let seed = 1; seed <= 3000; seed++) {
        const gen = makeRandom(seed)
        const proto = makeChain(gen)
        // Several instances per chain: the first builds the prototype's cached
        // shape, the rest exercise the cached path.
        for (let i = 0; i < 3; i++) {
          const instance = makeInstance(gen, proto)
          if (gen.random() < 0.1) {
            Object.setPrototypeOf(instance, makeChain(gen))
          }
          assert.strictEqual(Hash.hash(instance), reference(instance), `seed ${seed}, instance ${i}`)
        }
      }
    })

    it("satisfies equal => same hash for instances built from the same values", () => {
      for (let seed = 1; seed <= 1000; seed++) {
        const proto = makeChain(makeRandom(seed))
        const a = makeInstance(makeRandom(seed * 7919), proto)
        const b = makeInstance(makeRandom(seed * 7919), proto)
        if (Equal.equals(a, b)) {
          assert.strictEqual(Hash.hash(a), Hash.hash(b), `seed ${seed}`)
        }
      }
    })

    it("does not depend on the identity of prototype methods", () => {
      class A extends Data.Class<{ x: number }> {
        method() {
          return 1
        }
      }
      class B extends Data.Class<{ x: number }> {
        method() {
          return 1
        }
      }
      assert.isFalse(Equal.equals(new A({ x: 1 }), new B({ x: 1 })))
      assert.strictEqual(Hash.hash(new A({ x: 1 })), Hash.hash(new B({ x: 1 })))
    })

    it("does not depend on the identity of prototype objects", () => {
      const makeProto = () => Object.create(Object.prototype, { variance: { value: { _A: () => 1 } } })
      const a = Object.assign(Object.create(makeProto()), { x: 1 })
      const b = Object.assign(Object.create(makeProto()), { x: 1 })
      assert.strictEqual(Hash.hash(a), Hash.hash(b))
    })

    it("Hash.structure agrees with Hash.hash for class instances", () => {
      class WithMethod extends Data.Class<{ x: number }> {
        method() {
          return 1
        }
      }
      const instance = new WithMethod({ x: 1 })
      assert.strictEqual(Hash.structure(instance), Hash.hash(instance))
    })

    it("XORs shadowed prototype members back out", () => {
      class Base {
        method() {
          return 1
        }
      }
      class Shadowing extends Base {
        constant = 1
        override method = () => 2
      }
      const instance = new Shadowing()
      assert.strictEqual(Hash.hash(instance), reference(instance))
    })
  })

  describe("prototype immutability boundary", () => {
    it("reflects prototype members defined before the first hash", () => {
      class Late {
        readonly x = 1
      }
      const before = Hash.hash(new Late())
      class Late2 {
        readonly x = 1
      }
      ;(Late2.prototype as any).extra = 1
      assert.notStrictEqual(Hash.hash(new Late2()), before)
    })

    it("does not reflect prototype members added after instances were hashed", () => {
      class Frozen {
        readonly x = 1
      }
      const before = Hash.hash(new Frozen())
      ;(Frozen.prototype as any).extra = 1
      // Documented contract: the prototype's contribution was computed once.
      assert.strictEqual(Hash.hash(new Frozen()), before)
    })

    it("uses the prototype an object has when it is first hashed", () => {
      class From {
        readonly x = 1
      }
      class To {
        readonly x = 1
        get extra() {
          return 2
        }
      }
      const instance = new From()
      Object.setPrototypeOf(instance, To.prototype)
      assert.strictEqual(Hash.hash(instance), reference(instance))
    })
  })

  describe("symbols", () => {
    it("hashes unique and registered symbols consistently", () => {
      const unique = Symbol("k")
      assert.strictEqual(Hash.hash(unique), Hash.hash(unique))
      assert.strictEqual(Hash.hash(Symbol.for("effect/test/k")), Hash.hash(Symbol.for("effect/test/k")))
    })
  })
})

describe("Hash robustness", () => {
  it("hashes isomorphic cyclic graphs equally regardless of hashing order", () => {
    const make = () => {
      const a: any = { n: "a" }
      const b: any = { n: "b", a }
      a.b = b
      return [a, b]
    }
    const [a1] = make()
    const [a2, b2] = make()
    Hash.hash(b2) // hash a different entry point of the second graph first
    assert.strictEqual(Hash.hash(a1), Hash.hash(a2))
    assert.isTrue(Equal.equals(a1, a2))
  })

  it("does not leave an object marked as visited when a custom hash throws", () => {
    const bad = {
      [Hash.symbol]() {
        throw new Error("boom")
      }
    }
    const holder = { bad }
    assert.throws(() => Hash.hash(holder))
    // Before the fix, `holder` stayed marked as visited and every later hash
    // of it silently returned the circular-reference constant instead of throwing.
    assert.throws(() => Hash.hash(holder))
  })
})

describe("Hash distribution", () => {
  const distinctHashes = (values: ReadonlyArray<unknown>) => new Set(values.map(Hash.hash)).size
  const range = (n: number) => Array.from({ length: n }, (_, i) => i)
  const grid = <A>(n: number, f: (i: number, j: number) => A) => range(n).flatMap((i) => range(n).map((j) => f(i, j)))

  it("arrays are sensitive to order and to repetition", () => {
    assert.notStrictEqual(Hash.hash([1, 2]), Hash.hash([2, 1]))
    assert.notStrictEqual(Hash.hash([1, 1]), Hash.hash([2, 2]))
    assert.notStrictEqual(Hash.hash([1, 1]), Hash.hash([]))
    assert.notStrictEqual(Hash.hash([1, 2, 3]), Hash.hash([]))
  })

  it("sets and records are insensitive to insertion order", () => {
    assert.strictEqual(Hash.hash(new Set([1, 2, 3])), Hash.hash(new Set([3, 1, 2])))
    assert.strictEqual(Hash.hash({ a: 1, b: 2 }), Hash.hash({ b: 2, a: 1 }))
    assert.strictEqual(Hash.hash(new Map([["a", 1], ["b", 2]])), Hash.hash(new Map([["b", 2], ["a", 1]])))
  })

  it("records distinguish values swapped between keys", () => {
    assert.notStrictEqual(Hash.hash({ x: 1, y: 2 }), Hash.hash({ x: 2, y: 1 }))
    assert.notStrictEqual(Hash.hash(new Map([["x", 1], ["y", 2]])), Hash.hash(new Map([["x", 2], ["y", 1]])))
  })

  it("separates singletons from their string spellings", () => {
    for (const [value, spelling] of [[null, "null"], [undefined, "undefined"], [true, "true"], [false, "false"]]) {
      assert.notStrictEqual(Hash.hash(value), Hash.hash(spelling))
    }
  })

  it("hashes numbers consistently with Equal", () => {
    assert.strictEqual(Hash.hash(-0), Hash.hash(0))
    assert.strictEqual(Hash.hash(NaN), Hash.hash(Number.NaN))
    assert.notStrictEqual(Hash.hash(Infinity), Hash.hash(-Infinity))
    assert.notStrictEqual(Hash.hash(0.1), Hash.hash(0.2))
    assert.notStrictEqual(Hash.hash(-(2 ** 32)), Hash.hash(-(2 ** 33)))
  })

  // Regression floors for input families that previously collapsed: ideal
  // collisions for 10,000 values in a 31-bit space are about 0.02.
  it.each(
    [
      ["int pairs", () => grid(100, (a, b) => [a, b])],
      ["records {x, y}", () => grid(100, (x, y) => ({ x, y }))],
      ["sets {i, j}", () => grid(100, (i, j) => [i, j]).filter(([i, j]) => i < j).map((p) => new Set(p))],
      ["floats i * 0.1", () => range(10000).map((i) => i * 0.1)],
      ["negative multiples of 2^32", () => range(10000).map((i) => -(i + 1) * 2 ** 32)]
    ] as const
  )("keeps %s nearly collision-free", (_, values) => {
    const corpus = values() as ReadonlyArray<unknown>
    assert.isAtLeast(distinctHashes(corpus), corpus.length - 2)
  })
})

describe("Hash of Effect collections", () => {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i)

  it("HashMap.forEach and reduce visit entries in iteration order", () => {
    // Large enough for indexed and array nodes; the colliding keys force
    // collision nodes.
    const collide = (id: number) => ({ id, [Hash.symbol]: () => 7, [Equal.symbol]: (that: any) => that.id === id })
    const map = HashMap.fromIterable<unknown, number>([
      ...range(2000).map((i) => [i, i] as const),
      ...range(5).map((i) => [collide(i), i] as const)
    ])
    const iterated = Array.from(map, ([k, v]) => [k, v])
    const visited: Array<unknown> = []
    HashMap.forEach(map, (v, k) => visited.push([k, v]))
    assert.deepStrictEqual(visited, iterated)
    const reduced = HashMap.reduce(map, [] as Array<unknown>, (acc, v, k) => {
      acc.push([k, v])
      return acc
    })
    assert.deepStrictEqual(reduced, iterated)
  })

  it("HashMap and HashSet hashes follow Equal", () => {
    const a = HashMap.make(["x", 1], ["y", 2])
    const b = HashMap.make(["y", 2], ["x", 1])
    assert.isTrue(Equal.equals(a, b))
    assert.strictEqual(Hash.hash(a), Hash.hash(b))
    const s1 = HashSet.make(1, 2, 3)
    const s2 = HashSet.make(3, 2, 1)
    assert.isTrue(Equal.equals(s1, s2))
    assert.strictEqual(Hash.hash(s1), Hash.hash(s2))
  })

  it("HashMap and HashSet hashes distinguish their contents", () => {
    const grid = range(100).flatMap((x) => range(100).map((y) => [x, y] as const))
    assert.isAtLeast(new Set(grid.map(([x, y]) => Hash.hash(HashMap.make(["x", x], ["y", y])))).size, grid.length - 2)
    const pairs = grid.filter(([i, j]) => i < j)
    assert.isAtLeast(new Set(pairs.map(([i, j]) => Hash.hash(HashSet.make(i, j)))).size, pairs.length - 2)
  })

  it("hashes bigints, regular expressions and symbols consistently with Equal", () => {
    const big = BigInt(2) ** BigInt(70)
    assert.strictEqual(Hash.hash(BigInt(42)), Hash.hash(BigInt("42")))
    assert.strictEqual(Hash.hash(big + BigInt(1)), Hash.hash(BigInt(2) ** BigInt(70) + BigInt(1)))
    assert.notStrictEqual(Hash.hash(BigInt(1)), Hash.hash(BigInt(2)))
    assert.strictEqual(Hash.hash(/a+b/gi), Hash.hash(new RegExp("a+b", "gi")))
    assert.notStrictEqual(Hash.hash(/a+b/g), Hash.hash(/a+b/i))
    assert.strictEqual(Hash.hash(Symbol.for("effect/test/s")), Hash.hash(Symbol.for("effect/test/s")))
  })
})

describe("Hash laws across containers", () => {
  // Commutative containers (equality ignores order) must hash identically for
  // any insertion order; ordered containers must distinguish permutations.
  const shuffle = <A>(gen: Gen, xs: ReadonlyArray<A>): Array<A> => {
    const out = [...xs]
    for (let i = out.length - 1; i > 0; i--) {
      const j = gen.int(i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const distinctValues = (gen: Gen) => {
    const size = 2 + gen.int(8)
    return Array.from({ length: size }, (_, i) => gen.pick<unknown>([i, `s${i}`, [i, gen.int(3)], { k: i }]))
  }

  it("commutative containers hash identically under any insertion order", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gen = makeRandom(seed)
      const values = distinctValues(gen)
      const reordered = shuffle(gen, values)
      const entries = values.map((v, i) => [`key${i}`, v] as const)
      const reorderedEntries = shuffle(gen, entries)
      const pairs: ReadonlyArray<readonly [unknown, unknown]> = [
        [new Set(values), new Set(reordered)],
        [HashSet.fromIterable(values), HashSet.fromIterable(reordered)],
        [new Map(entries), new Map(reorderedEntries)],
        [HashMap.fromIterable(entries), HashMap.fromIterable(reorderedEntries)],
        [Object.fromEntries(entries), Object.fromEntries(reorderedEntries)]
      ]
      for (const [a, b] of pairs) {
        assert.isTrue(Equal.equals(a, b), `seed ${seed}`)
        assert.strictEqual(Hash.hash(a), Hash.hash(b), `seed ${seed}`)
      }
    }
  })

  it("ordered containers distinguish permutations", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gen = makeRandom(seed)
      const values = distinctValues(gen)
      const reordered = [...values].reverse()
      assert.notStrictEqual(Hash.hash(values), Hash.hash(reordered), `seed ${seed}`)
      assert.notStrictEqual(Hash.hash(Chunk.fromIterable(values)), Hash.hash(Chunk.fromIterable(reordered)))
    }
  })
})

describe("HashMap Merkle hashing", () => {
  // Cached subtree hashes must never go stale: after any sequence of persistent
  // and transient (in-place) edits, including edits made after hashes were
  // computed mid-transaction, a map must equal and hash like a fresh rebuild.
  it("stays consistent under persistent and transient edits", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const gen = makeRandom(seed)
      let map = HashMap.empty<unknown, unknown>()
      const probe = HashMap.make(["probe", 0])
      for (let step = 0; step < 60; step++) {
        const key = gen.pick<unknown>([gen.int(40), `k${gen.int(40)}`, [gen.int(5), gen.int(5)]])
        if (gen.random() < 0.3) {
          map = HashMap.mutate(map, (m) => {
            for (let i = 0; i < 1 + gen.int(20); i++) {
              const k = gen.pick<unknown>([gen.int(40), `k${gen.int(40)}`])
              if (gen.random() < 0.7) HashMap.set(m, k, gen.int(5))
              else HashMap.remove(m, k)
              // Computes and caches subtree hashes mid-transaction.
              if (gen.random() < 0.3) entriesHash(m)
            }
          })
        } else if (gen.random() < 0.7) {
          map = HashMap.set(map, key, gen.int(5))
        } else {
          map = HashMap.remove(map, key)
        }
        Equal.equals(map, probe) // cache hashes on the current version
        const rebuilt = HashMap.fromIterable(Array.from(map))
        assert.isTrue(Equal.equals(map, rebuilt), `seed ${seed}, step ${step}`)
        assert.isTrue(Equal.equals(rebuilt, map), `seed ${seed}, step ${step}`)
        assert.strictEqual(Hash.hash(HashMap.fromIterable(Array.from(map))), Hash.hash(rebuilt))
      }
    }
  })

  it("detects a single changed value between versions", () => {
    let map = HashMap.fromIterable(Array.from({ length: 5000 }, (_, i) => [i, i] as const))
    Equal.equals(map, HashMap.empty())
    for (let i = 0; i < 50; i++) {
      const next = HashMap.set(map, i * 97, -1)
      assert.isFalse(Equal.equals(next, map))
      map = next
    }
  })
})

describe("Hash laws for persistent sequences and tries", () => {
  // Chunk hashes are an associative monoid over the sequence: every way of
  // building the same sequence (and every tree shape) must hash identically.
  const buildGrouped = (gen: Gen, xs: ReadonlyArray<unknown>): Chunk.Chunk<unknown> => {
    if (xs.length <= 2) return Chunk.fromIterable(xs)
    const cut = 1 + gen.int(xs.length - 1)
    return Chunk.appendAll(buildGrouped(gen, xs.slice(0, cut)), buildGrouped(gen, xs.slice(cut)))
  }

  it("Chunk hashing is independent of how the sequence was built", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gen = makeRandom(seed)
      const xs = Array.from(
        { length: gen.int(60) },
        () => gen.pick<unknown>([gen.int(10), `s${gen.int(5)}`, [gen.int(3)]])
      )
      const flat = Chunk.fromIterable(xs)
      const variants = [
        xs.reduce<Chunk.Chunk<unknown>>((c, x) => Chunk.append(c, x), Chunk.empty()),
        [...xs].reverse().reduce<Chunk.Chunk<unknown>>((c, x) => Chunk.prepend(c, x), Chunk.empty()),
        buildGrouped(gen, xs),
        buildGrouped(gen, xs),
        Chunk.drop(Chunk.take(Chunk.fromIterable([0, ...xs, 1]), xs.length + 1), 1)
      ]
      for (const variant of variants) {
        assert.isTrue(Equal.equals(flat, variant), `seed ${seed}`)
        assert.strictEqual(Hash.hash(variant), Hash.hash(flat), `seed ${seed}`)
      }
    }
  })

  it("Chunk hashing reflects order and incremental versions", () => {
    let chunk = Chunk.empty<number>()
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      chunk = Chunk.append(chunk, i % 7)
      seen.add(Hash.hash(chunk))
    }
    assert.isAtLeast(seen.size, 1998)
    assert.notStrictEqual(Hash.hash(Chunk.make(1, 2)), Hash.hash(Chunk.make(2, 1)))
  })

  it("Trie hashing and equality are independent of insertion order", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gen = makeRandom(seed)
      const entries = Array.from(
        { length: gen.int(30) },
        (_, i) => [`${gen.pick(["a", "ab", "b", ""])}${i}`, gen.int(4)] as const
      )
      const shuffled = [...entries].sort(() => gen.random() - 0.5)
      const a = Trie.fromIterable(entries)
      const b = Trie.fromIterable(shuffled)
      assert.isTrue(Equal.equals(a, b), `seed ${seed}`)
      assert.strictEqual(Hash.hash(a), Hash.hash(b), `seed ${seed}`)
      if (entries.length > 0) {
        const changed = Trie.insert(b, entries[0][0], 99)
        assert.isFalse(Equal.equals(a, changed), `seed ${seed}`)
      }
    }
  })
})

describe("Equal equivalence cache", () => {
  // Builds a deterministic value per family: values of the same family are
  // equal but distinct objects, so the pool contains equivalence classes.
  const buildFamily = (family: number): unknown => {
    const gen = makeRandom(family + 1)
    const node = (depth: number): unknown =>
      depth > 2 || gen.random() < 0.3
        ? gen.pick<unknown>([gen.int(3), `s${gen.int(3)}`])
        : gen.pick<unknown>([
          Array.from({ length: gen.int(3) }, () => node(depth + 1)),
          { a: node(depth + 1), b: node(depth + 1) },
          HashMap.make(["k", node(depth + 1)]),
          Chunk.make(node(depth + 1), node(depth + 1))
        ])
    return { family: family % 4 === 0 ? 0 : family, payload: node(0) }
  }

  it("answers every comparison like a cache-free comparison, including via transitivity", () => {
    const families = Array.from({ length: 12 }, (_, i) => i)
    const pool = families.flatMap((f) => [buildFamily(f), buildFamily(f), buildFamily(f)])
    const familyOf = families.flatMap((f) => [f, f, f])
    const gen = makeRandom(4242)
    for (let step = 0; step < 5000; step++) {
      const i = gen.int(pool.length)
      const j = gen.int(pool.length)
      // Ground truth on fresh copies that have never been compared.
      const expected = Equal.equals(buildFamily(familyOf[i]), buildFamily(familyOf[j]))
      assert.strictEqual(Equal.equals(pool[i], pool[j]), expected, `step ${step}: ${i} vs ${j}`)
    }
  })

  it("derives equality through transitivity without reporting false positives", () => {
    const a = { x: [1, 2, { y: 3 }] }
    const b = { x: [1, 2, { y: 3 }] }
    const c = { x: [1, 2, { y: 3 }] }
    const d = { x: [1, 2, { y: 4 }] }
    assert.isTrue(Equal.equals(a, b))
    assert.isTrue(Equal.equals(b, c))
    assert.isTrue(Equal.equals(a, c)) // never compared directly
    assert.isFalse(Equal.equals(a, d))
    assert.isFalse(Equal.equals(d, c))
  })
})

describe("Hash.combine", () => {
  it("is order-sensitive and agrees across its data-first and data-last forms", () => {
    const a = Hash.hash("a")
    const b = Hash.hash("b")
    assert.notStrictEqual(Hash.combine(a, b), Hash.combine(b, a))
    assert.strictEqual(Hash.combine(a, b), Hash.combine(b)(a))
  })

  it("keeps custom hashers over small fields nearly collision-free", () => {
    const hashes = new Set<number>()
    for (let a = 0; a < 100; a++) {
      for (let b = 0; b < 100; b++) hashes.add(Hash.combine(Hash.hash(a), Hash.hash(b)))
    }
    assert.isAtLeast(hashes.size, 10_000 - 2)
  })
})

describe("Equal on class instances", () => {
  // Reference from the specification: equal key sets per `getAllObjectKeys`,
  // and equal values under every key.
  const reference = (a: object, b: object): boolean => {
    const aKeys = getAllObjectKeys(a)
    const bKeys = getAllObjectKeys(b)
    if (aKeys.size !== bKeys.size) return false
    for (const key of aKeys) {
      if (!bKeys.has(key) || !Equal.equals((a as any)[key], (b as any)[key])) return false
    }
    return true
  }

  it("agrees with the reference on instances sharing a random prototype chain", () => {
    let equalPairs = 0
    for (let seed = 1; seed <= 3000; seed++) {
      const proto = makeChain(makeRandom(seed))
      const a = makeInstance(makeRandom(seed * 31), proto)
      const b = makeInstance(makeRandom(seed * 31), proto)
      const gen = makeRandom(seed * 97)
      if (gen.random() < 0.5) {
        // Perturb: add, remove or change an own key.
        const key = gen.pick(keyPool)
        if (key !== "constructor") {
          const choice = gen.int(3)
          if (choice === 0) delete (b as any)[key]
          else Object.defineProperty(b, key, { value: gen.primitive(), enumerable: true, configurable: true })
        }
      }
      const expected = reference(a, b)
      if (expected) equalPairs++
      assert.strictEqual(Equal.equals(a, b), expected, `seed ${seed}`)
    }
    assert.isAbove(equalPairs, 500)
  })
})

describe("Hash of strings and bytes", () => {
  it("equal one-byte typed arrays of different types hash alike", () => {
    for (let n = 0; n < 40; n++) {
      const values = Array.from({ length: n }, (_, i) => (i * 37) % 128)
      const u8 = new Uint8Array(values)
      const i8 = new Int8Array(values)
      const c8 = new Uint8ClampedArray(values)
      assert.isTrue(Equal.equals(u8, i8))
      assert.strictEqual(Hash.hash(u8), Hash.hash(i8), `length ${n}`)
      assert.strictEqual(Hash.hash(u8), Hash.hash(c8), `length ${n}`)
    }
  })

  it("data views hash their bytes regardless of offset or alignment", () => {
    const source = new Uint8Array(Array.from({ length: 64 }, (_, i) => i))
    for (let offset = 0; offset < 8; offset++) {
      for (const length of [0, 1, 3, 4, 5, 16, 31]) {
        const buffer = new Uint8Array(offset + length)
        buffer.set(source.subarray(0, length), offset)
        const view = new DataView(buffer.buffer, offset, length)
        const reference = new DataView(source.slice(0, length).buffer)
        assert.strictEqual(Hash.hash(view), Hash.hash(reference), `offset ${offset}, length ${length}`)
      }
    }
  })

  it("byte arrays and long strings distinguish near-identical inputs", () => {
    const byteInputs = new Set<string>()
    const byteHashes = new Set<number>()
    const stringHashes = new Set<number>()
    for (let i = 0; i < 10_000; i++) {
      const b = new Uint8Array(20)
      b[i % 20] = i & 0xff
      b[(i + 7) % 20] = (i >> 8) + 1
      byteInputs.add(b.join(","))
      byteHashes.add(Hash.hash(b))
      stringHashes.add(Hash.hash(`00000000-0000-0000-0000-${String(i).padStart(12, "0")}`))
    }
    assert.isAtLeast(byteHashes.size, byteInputs.size - 2)
    assert.isAtLeast(stringHashes.size, 10_000 - 2)
    assert.strictEqual(Hash.string("x".repeat(40)), Hash.string("x".repeat(40)))
    assert.notStrictEqual(Hash.string("x".repeat(40)), Hash.string("x".repeat(41)))
  })
})

describe("Chunk slice hashing", () => {
  it("hashes any slice of any chunk like the same elements built flat", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const gen = makeRandom(seed)
      const xs = Array.from(
        { length: 1 + gen.int(80) },
        (_, i) => gen.pick<unknown>([i, `s${gen.int(4)}`, [gen.int(3)]])
      )
      const pieces: Array<Chunk.Chunk<unknown>> = []
      for (let i = 0; i < xs.length;) {
        const size = 1 + gen.int(10)
        pieces.push(Chunk.fromIterable(xs.slice(i, i + size)))
        i += size
      }
      const chunk = pieces.reduce((acc, piece) => Chunk.appendAll(acc, piece), Chunk.empty<unknown>())
      const from = gen.int(xs.length)
      const to = from + gen.int(xs.length - from + 1)
      const slice = Chunk.take(Chunk.drop(chunk, from), to - from)
      const nested = Chunk.drop(Chunk.take(Chunk.drop(chunk, from), to - from + 1), 1)
      assert.strictEqual(Hash.hash(slice), Hash.hash(Chunk.fromIterable(xs.slice(from, to))), `seed ${seed}`)
      assert.strictEqual(
        Hash.hash(nested),
        Hash.hash(Chunk.fromIterable(xs.slice(from + 1, Math.min(to + 1, xs.length)))),
        `seed ${seed}`
      )
    }
  })
})
