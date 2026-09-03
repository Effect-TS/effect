import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { ChunkedMessage } from "effect/unstable/eventlog/EventLogMessage"

const bytes = (size: number) => Uint8Array.from({ length: size }, (_, index) => index % 251)

const roundTrip = (label: string, id: number, input: Uint8Array, expectedParts: number, reverse = false) => {
  const parts = ChunkedMessage.split(id, input)
  console.log(JSON.stringify({
    candidate: "eventlog-chunked-split-empty-nonempty-contract",
    label,
    id,
    inputBytes: input.byteLength,
    inputOffset: input.byteOffset,
    expectedParts,
    actualParts: parts.length,
    parts: parts.map((part) => ({ id: part.id, part: part.part, bytes: part.data.byteLength }))
  }))
  assert.strictEqual(parts.length, expectedParts)
  // This access is guaranteed by split's public NonEmptyReadonlyArray return.
  const first: ChunkedMessage = parts[0]
  assert.strictEqual(first.id, id)
  assert.deepStrictEqual(first.part, [0, expectedParts])
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]
    assert.isTrue(Schema.is(ChunkedMessage)(part))
    assert.strictEqual(part.id, id)
    assert.deepStrictEqual(part.part, [index, expectedParts])
    assert.deepStrictEqual(
      part.data,
      input.subarray(index * ChunkedMessage.chunkSize, (index + 1) * ChunkedMessage.chunkSize)
    )
  }
  const state = ChunkedMessage.initialJoinState()
  const delivery = reverse ? [...parts].reverse() : parts
  let completions = 0
  for (let index = 0; index < delivery.length; index++) {
    const output = ChunkedMessage.join(state, delivery[index])
    if (index < delivery.length - 1) {
      assert.isUndefined(output)
      assert.strictEqual(state.size, 1)
    } else {
      assert.isDefined(output)
      assert.deepStrictEqual(output, input)
      completions++
      assert.strictEqual(state.size, 0)
    }
  }
  assert.strictEqual(completions, 1)
  console.log(
    JSON.stringify({ label, id, completions, outputBytes: input.byteLength, remainingIds: [...state.keys()] })
  )
}

describe("ChunkedMessage split/join boundary", () => {
  it("empty allocation", () => roundTrip("empty-allocation", 101, new Uint8Array(0), 1))

  it("empty subarray", () => roundTrip("empty-subarray", 102, bytes(8).subarray(3, 3), 1))

  it("empty buffer view", () => roundTrip("empty-buffer-view", 103, new Uint8Array(new ArrayBuffer(8), 5, 0), 1))

  it("one byte", () => roundTrip("one-byte", 104, Uint8Array.of(7), 1))

  it("exact chunkSize", () => roundTrip("exact-chunkSize", 105, bytes(ChunkedMessage.chunkSize), 1))

  it("chunkSize plus one", () => roundTrip("chunkSize-plus-one", 106, bytes(ChunkedMessage.chunkSize + 1), 2))

  it("nonzero byte view offset", () => {
    const backing = bytes(ChunkedMessage.chunkSize + 19)
    const view = backing.subarray(7, 7 + ChunkedMessage.chunkSize + 1)
    assert.strictEqual(view.byteOffset, 7)
    roundTrip("byte-view-offset", 107, view, 2)
  })

  it("out-of-order join", () => roundTrip("out-of-order", 108, bytes(ChunkedMessage.chunkSize + 1), 2, true))

  it("an explicit empty chunk is schema-valid and completes", () => {
    const state = ChunkedMessage.initialJoinState()
    const chunk = new ChunkedMessage({ id: 109, part: [0, 1], data: new Uint8Array(0) })
    assert.isTrue(Schema.is(ChunkedMessage)(chunk))
    assert.deepStrictEqual(ChunkedMessage.join(state, chunk), new Uint8Array(0))
    assert.strictEqual(state.size, 0)
  })

  it("completed IDs can be reused without clearing another pending ID", () => {
    const state = ChunkedMessage.initialJoinState()
    const pending = new ChunkedMessage({ id: 110, part: [0, 2], data: Uint8Array.of(1) })
    assert.isUndefined(ChunkedMessage.join(state, pending))
    const first = new ChunkedMessage({ id: 111, part: [0, 1], data: new Uint8Array(0) })
    assert.deepStrictEqual(ChunkedMessage.join(state, first), new Uint8Array(0))
    assert.deepStrictEqual([...state.keys()], [110])
    const next = ChunkedMessage.split(111, Uint8Array.of(9))[0]
    assert.deepStrictEqual(ChunkedMessage.join(state, next), Uint8Array.of(9))
    assert.deepStrictEqual([...state.keys()], [110])
    const last = new ChunkedMessage({ id: 110, part: [1, 2], data: Uint8Array.of(2) })
    assert.deepStrictEqual(ChunkedMessage.join(state, last), Uint8Array.of(1, 2))
    assert.strictEqual(state.size, 0)
    console.log(
      JSON.stringify({ label: "reuse-cleanup", completedIds: [111, 111, 110], completions: 3, remainingIds: [] })
    )
  })
})
