import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { Effect } from "effect"
import { strict as assert } from "node:assert"
import { Readable } from "node:stream"

const helper = process.argv[2] as "toString" | "toArrayBuffer"
const exceedsLimit = process.argv[3] === "maxBytes"
let emitted = false
const source = new Readable({
  read() {
    if (exceedsLimit && !emitted) {
      emitted = true
      this.push(Buffer.from("too large"))
    }
  },
  destroy(_error, callback) {
    setImmediate(() => callback(new Error("destroy failed")))
  }
})
// Do not install an error listener here: the collector must protect its own teardown.
const closed = new Promise<void>((resolve) => source.once("close", resolve))
const consume = helper === "toString" ? NodeStream.toString : NodeStream.toArrayBuffer
const collected: Effect.Effect<unknown, string> = consume(() => source, {
  maxBytes: exceedsLimit ? 1 : undefined,
  onError: (error) => (error as Error).message
})
const error = await Effect.runPromise(collected.pipe(Effect.timeout("20 millis"), Effect.flip))
if (exceedsLimit) {
  assert.equal(error, "maxBytes exceeded")
} else {
  assert.equal(typeof error === "string" ? error : error._tag, "TimeoutError")
}
await closed
console.log("destruction completed")
