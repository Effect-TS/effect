/** @internal */
import * as Effect from "../../Effect.ts"
import { derive } from "./argon2.ts"
import { allocate, type fill } from "./argon2Core.ts"
import type { Argon2 } from "./kdf.ts"

/** ABI of the package's owned argon2.wasm, built from argon2Block.c. */
interface Exports extends WebAssembly.Exports {
  readonly __heap_base: WebAssembly.Global
  readonly argon2_block: (
    scratch: number,
    memory: number,
    x: number,
    y: number,
    out: number,
    xor: number
  ) => void
}

/** @internal */
export const makeArgon2 = (module: WebAssembly.Module): Argon2 => (input) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      // Each admitted derivation owns an instance. Two extra pages cover the
      // module's 64 KiB stack, scratch, address, initial and final buffers.
      const memory = new WebAssembly.Memory({
        initial: 2,
        maximum: Math.ceil(input.memoryKiB / 64) + 2
      })

      const exports = new WebAssembly.Instance(module, { env: { memory } }).exports as Exports
      const byteOffset = Number(exports.__heap_base.value)
      const block = exports.argon2_block
      const bytes = byteOffset + (input.memoryKiB + 5) * 1024 + 72

      memory.grow(Math.max(0, Math.ceil(bytes / 65536) - 2))
      const state = allocate(input, { buffer: memory.buffer, byteOffset })

      const compress: NonNullable<Parameters<typeof fill>[2]> = (
        scratch,
        words,
        x,
        y,
        out,
        xor
      ) => block(scratch.byteOffset, words.byteOffset, x, y, out, Number(xor))

      return { memory, state, compress }
    }),
    ({ state, compress }) => derive(input, state, compress),
    // Clear the entire linear memory, including any compiler stack spills,
    // before Kdf releases admission on completion, failure or interruption.
    ({ memory }) => Effect.sync(() => new Uint8Array(memory.buffer).fill(0))
  )
