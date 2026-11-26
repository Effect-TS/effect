// Prints `Formatter.format` output for `toString` edge cases in one copy of effect: a method that
// throws, one that returns a value that cannot be converted to a string, one that returns a
// non-string, an accessor (with the number of times it is read) and an accessor that throws.
// Run it once per copy and compare the lines.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/format-edge.mjs <absolute dist dir>
const { format } = await import(process.argv[2] + "/Formatter.js")
const throwing = { toString() { throw new Error("boom") } }
const unconvertible = { toString: () => throwing }
let reads = 0
const counted = { get toString() { reads++; return () => "counted" } }
const throwingGetter = { get toString() { throw new Error("boom") } }
console.log(JSON.stringify({
  unconvertible: format(unconvertible),
  nonString: format({ toString: () => 42 }),
  throwing: format(throwing),
  counted: format(counted),
  reads,
  throwingGetter: format(throwingGetter),
  nested: format({ a: unconvertible, b: [throwing] }, { space: 2 })
}))
