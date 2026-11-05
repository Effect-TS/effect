// Run by Yaml.test.ts in a fresh process, where the parser runs before the JIT compiles it
// and its stack frames are largest, so it finds overflows a warmed test process hides.
import { Result } from "effect"
import * as Yaml from "effect/encoding/Yaml"

// Nested mappings whose anchors sit alone on the line after each key, around the leaf `1`.
const depth = Number(process.argv[2])
const source = Array.from(
  { length: depth - 1 },
  (_, i) => `${" ".repeat(2 * i)}k:\n${" ".repeat(2 * i + 1)}&a${i}`
).concat(`${" ".repeat(2 * (depth - 1))}k: 1`).join("\n") + "\n"

const result = Yaml.parse(source)
if (Result.isFailure(result)) {
  console.log(result.failure.message)
} else {
  let value: unknown = result.success
  for (let index = 0; index < depth; index++) value = (value as { readonly k: unknown }).k
  console.log(JSON.stringify(value))
}
