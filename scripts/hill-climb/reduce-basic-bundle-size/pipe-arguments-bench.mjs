// Compares pipeArguments variants: the unrolled switch (0 to 9 functions), a
// switch for 0 to 5 functions with a loop above, and a plain loop.
// Usage: node scripts/hill-climb/reduce-basic-bundle-size/pipe-arguments-bench.mjs [calls]
// Each variant is called through `pipe() { return pipeArguments(this, arguments) }`
// on a class prototype from call sites with literal arguments, as user code
// does. Variants run interleaved over several rounds in one process; each cell
// is the median ns per call. "mixed" cycles one call site through 0 to 10
// functions. Run it more than once: differences under about 10% are noise.

const unrolled = (self, args) => {
  switch (args.length) {
    case 0:
      return self
    case 1:
      return args[0](self)
    case 2:
      return args[1](args[0](self))
    case 3:
      return args[2](args[1](args[0](self)))
    case 4:
      return args[3](args[2](args[1](args[0](self))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](self)))))
    case 6:
      return args[5](args[4](args[3](args[2](args[1](args[0](self))))))
    case 7:
      return args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))
    case 8:
      return args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self))))))))
    case 9:
      return args[8](args[7](args[6](args[5](args[4](args[3](args[2](args[1](args[0](self)))))))))
    default: {
      let ret = self
      for (let i = 0, len = args.length; i < len; i++) {
        ret = args[i](ret)
      }
      return ret
    }
  }
}

const upToFive = (self, args) => {
  switch (args.length) {
    case 0:
      return self
    case 1:
      return args[0](self)
    case 2:
      return args[1](args[0](self))
    case 3:
      return args[2](args[1](args[0](self)))
    case 4:
      return args[3](args[2](args[1](args[0](self))))
    case 5:
      return args[4](args[3](args[2](args[1](args[0](self)))))
    default: {
      let ret = self
      for (let i = 0, len = args.length; i < len; i++) {
        ret = args[i](ret)
      }
      return ret
    }
  }
}

const loop = (self, args) => {
  let ret = self
  for (let i = 0, len = args.length; i < len; i++) {
    ret = args[i](ret)
  }
  return ret
}

class Box {
  constructor(n) {
    this.n = n
  }
}
const f0 = (box) => new Box(box.n + 1)
const f1 = (box) => new Box(box.n + 2)
const f2 = (box) => new Box(box.n + 3)
const f3 = (box) => new Box(box.n + 4)
const f4 = (box) => new Box(box.n + 5)
const f5 = (box) => new Box(box.n + 6)
const f6 = (box) => new Box(box.n + 7)
const f7 = (box) => new Box(box.n + 8)
const f8 = (box) => new Box(box.n + 9)
const f9 = (box) => new Box(box.n + 10)

// A fresh copy of the call sites per variant keeps their feedback separate
const makeCallSites = () =>
  new Function("f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", `return {
  0: (box) => box.pipe(),
  1: (box) => box.pipe(f0),
  2: (box) => box.pipe(f0, f1),
  3: (box) => box.pipe(f0, f1, f2),
  4: (box) => box.pipe(f0, f1, f2, f3),
  5: (box) => box.pipe(f0, f1, f2, f3, f4),
  6: (box) => box.pipe(f0, f1, f2, f3, f4, f5),
  7: (box) => box.pipe(f0, f1, f2, f3, f4, f5, f6),
  8: (box) => box.pipe(f0, f1, f2, f3, f4, f5, f6, f7),
  9: (box) => box.pipe(f0, f1, f2, f3, f4, f5, f6, f7, f8),
  10: (box) => box.pipe(f0, f1, f2, f3, f4, f5, f6, f7, f8, f9),
}`)(f0, f1, f2, f3, f4, f5, f6, f7, f8, f9)

const variants = {}
for (const [name, pipeArguments] of Object.entries({ unrolled, upToFive, loop })) {
  // A separate prototype per variant, like separate builds
  const proto = new Function("pipeArguments", "return { pipe() { return pipeArguments(this, arguments) } }")(
    pipeArguments
  )
  variants[name] = { proto, sites: makeCallSites(), mixed: makeCallSites() }
}

const calls = Number(process.argv[2] ?? 3_000_000)
const counts = [0,1,2,3,4,5,6,7,8,9,10]
let sink = 0

const time = (body) => {
  const start = process.hrtime.bigint()
  body()
  return Number(process.hrtime.bigint() - start) / calls
}

const rounds = 7
const results = {}
for (let round = 0; round < rounds; round++) {
  for (const [name, { proto, sites, mixed }] of Object.entries(variants)) {
    const box = Object.assign(Object.create(proto), { n: 1 })
    for (const count of counts) {
      const site = sites[count]
      ;((results[name] ??= {})[count] ??= []).push(time(() => {
        for (let i = 0; i < calls; i++) sink += site(box).n
      }))
    }
    // One call site that sees every argument count
    const all = counts.map((count) => mixed[count])
    ;(results[name].mixed ??= []).push(time(() => {
      for (let i = 0; i < calls; i++) sink += all[i % all.length](box).n
    }))
  }
}

const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1]
const names = Object.keys(variants)
console.log(`node ${process.version}, ${calls} calls per sample, median of ${rounds} rounds (ns/call)`)
console.log(["functions", ...names, ...names.slice(1).map((name) => `${name}/unrolled`)].join("\t"))
for (const key of [...counts, "mixed"]) {
  const row = names.map((name) => median(results[name][key]))
  console.log([key, ...row.map((x) => x.toFixed(2)), ...row.slice(1).map((x) => (x / row[0]).toFixed(2))].join("\t"))
}
if (sink === 0) console.log("unreachable")
