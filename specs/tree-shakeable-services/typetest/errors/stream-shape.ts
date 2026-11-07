// A shape returning a Stream given to Context.Operation is rejected on the key argument, naming the constructor to use.
import * as Context from "effect/Context"
import type * as Stream from "effect/Stream"

export const stream = Context.Operation<(path: string) => Stream.Stream<Uint8Array>>()("test/stream")
