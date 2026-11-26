// Checks that `Formatter.format` prints the same text in two copies of effect.
// It formats random nested values, including the awkward ones: `toString` methods that
// throw or return something that cannot be converted to a string, throwing getters,
// revoked proxies, cycles, invalid dates, errors with causes and redactable values.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/format-parity.mjs <base dist> <current dist> [cases]
import { pathToFileURL } from "node:url"
import * as NodePath from "node:path"

const [baseDir, currentDir, casesArg] = process.argv.slice(2)
const cases = Number(casesArg ?? 20000)
const load = (dir, file) => import(pathToFileURL(NodePath.resolve(dir, file)).href)
const copies = await Promise.all([baseDir, currentDir].map(async (dir) => ({
  format: (await load(dir, "Formatter.js")).format,
  redactable: (await load(dir, "Redactable.js")).symbolRedactable
})))
if (copies[0].redactable !== copies[1].redactable) throw new Error("copies disagree on the Redactable symbol")
const symbolRedactable = copies[0].redactable

let seed = 0x2f6e2b1
const random = () => {
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  return (seed >>> 0) / 0x100000000
}
const pick = (items) => items[Math.floor(random() * items.length)]

class Point {
  constructor(x, y) {
    this.x = x
    this.y = y
  }
}
class Named {
  constructor(value) {
    this.value = value
  }
  toString() {
    return `Named<${String(this.value)}>`
  }
}
const unconvertible = { toString: () => ({}), valueOf: () => ({}) }

const leaves = [
  () => Math.floor(random() * 1000) - 500,
  () => random() * 1e6,
  () => pick([NaN, Infinity, -Infinity, -0, 0]),
  () => pick(["", "a", "quote\"d", "line\nbreak", "ünï"]),
  () => BigInt(Math.floor(random() * 1e9)),
  () => pick([true, false, null, undefined]),
  () => Symbol(pick(["s", ""])),
  () => Symbol.for("shared"),
  () => new Date(pick([0, 1e12, NaN])),
  () => /ab+c/gi,
  () => pick([() => 1, function named() {}]),
  // toString edge cases
  () => ({
    toString() {
      throw new Error("toString threw")
    }
  }),
  () => ({ toString: () => 42 }),
  () => ({ toString: () => undefined }),
  () => ({ toString: () => Symbol("from toString") }),
  () => ({ toString: () => unconvertible }),
  () => ({ toString: "not a function" }),
  () => Object.defineProperty({}, "toString", {
    get() {
      throw new Error("toString getter threw")
    }
  }),
  () => {
    const { proxy, revoke } = Proxy.revocable({}, {})
    revoke()
    return proxy
  },
  () => new Proxy({}, {
    ownKeys() {
      throw new Error("ownKeys threw")
    }
  }),
  () => Object.create(null),
  () => new Uint8Array([1, 2, 3]),
  () => new ArrayBuffer(4)
]

const value = (depth) => {
  if (depth <= 0 || random() < 0.3) return pick(leaves)()
  const size = Math.floor(random() * 4)
  const children = () => Array.from({ length: size }, () => value(depth - 1))
  switch (Math.floor(random() * 12)) {
    case 0:
      return children()
    case 1: {
      const out = {}
      for (const child of children()) out[pick(["a", "b", "c", "key with space", "0"])] = child
      if (random() < 0.2) out[Symbol("sym")] = value(depth - 1)
      return out
    }
    case 2:
      return new Map(children().map((child, i) => [pick([i, `k${i}`, { k: i }]), child]))
    case 3:
      return new Set(children())
    case 4:
      return new Point(value(depth - 1), value(depth - 1))
    case 5:
      return new Named(value(depth - 1))
    case 6:
      return new Error("boom", random() < 0.5 ? { cause: value(depth - 1) } : undefined)
    case 7: {
      const out = children()
      out.push(out)
      return out
    }
    case 8: {
      const out = { self: undefined, other: value(depth - 1) }
      out.self = out
      return out
    }
    case 9: {
      const inner = value(depth - 1)
      return {
        hidden: "secret",
        [symbolRedactable]: () => {
          if (inner === undefined) throw new Error("redaction threw")
          return inner
        }
      }
    }
    case 10:
      return Object.defineProperty({ ok: value(depth - 1) }, "bad", {
        enumerable: true,
        get() {
          throw new Error("getter threw")
        }
      })
    default: {
      const out = Object.create({ inherited: 1 })
      out.own = value(depth - 1)
      return out
    }
  }
}

const optionSets = [
  undefined,
  { space: 0 },
  { space: 2 },
  { space: "\t" },
  { ignoreToString: true },
  { ignoreToString: true, space: 2 }
]
const attempt = (format, input, options) => {
  try {
    return `ok:${format(input, options)}`
  } catch (error) {
    return `throws:${error?.constructor?.name}`
  }
}

let mismatches = 0
const seen = new Map()
for (let i = 0; i < cases; i++) {
  const input = value(4)
  for (const options of optionSets) {
    const base = attempt(copies[0].format, input, options)
    const current = attempt(copies[1].format, input, options)
    for (const marker of ["[toString threw]", "[inspection threw]", "[property access threw]", "[ownKeys threw]", "[Circular]"]) {
      if (base.includes(marker)) seen.set(marker, (seen.get(marker) ?? 0) + 1)
    }
    if (base !== current) {
      if (mismatches++ < 5) console.log("MISMATCH", JSON.stringify(options), "\n  base   ", base, "\n  current", current)
    }
  }
}
console.log(`format parity: ${cases * optionSets.length} comparisons, ${mismatches} mismatches`)
for (const [marker, count] of seen) console.log(`  outputs containing ${marker}: ${count}`)
if (mismatches > 0) process.exit(1)
