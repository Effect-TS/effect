import { assert, it } from "@effect/vitest"
import { Effect, Exit, Stream } from "effect"
import * as Msgpack from "effect/unstable/encoding/Msgpack"
import { encode } from "msgpackr"

it.effect("fails when the stream ends with an incomplete MessagePack frame", () =>
  Effect.gen(function*() {
    const frame = encode("hello")
    const exit = yield* Stream.make(frame.subarray(0, frame.length - 1)).pipe(
      Stream.pipeThroughChannel(Msgpack.decode()),
      Stream.runCollect,
      Effect.exit
    )

    assert.isTrue(Exit.isFailure(exit))
  }))
