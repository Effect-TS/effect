// A shape returning a Stream is not accepted by Context.Operation; it is defined with Stream.Operation.
import * as Context from "effect/Context"
import type * as Stream from "effect/Stream"

export const stream = Context.Operation<(path: string) => Stream.Stream<Uint8Array>>()("test/stream")
