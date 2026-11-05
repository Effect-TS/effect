// A shape returning an Effect given to Stream.Operation is rejected on the key argument, naming the constructor to use.
import type * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

export const readFile = Stream.Operation<(path: string) => Effect.Effect<Uint8Array>>()("test/readFile")
