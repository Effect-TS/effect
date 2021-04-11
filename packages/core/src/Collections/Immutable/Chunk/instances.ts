import * as Chunk from "@effect-ts/system/Collections/Immutable/Chunk"

import type { ChunkURI } from "../../../Modules"
import * as P from "../../../Prelude"

export const Collection = P.instance<P.Collection<[P.URI<ChunkURI>]>>({
  builder: Chunk.builder
})
