import { Chunk } from "../definition"

/**
 * Builder
 *
 * @tsplus static ets/ChunkOps builder
 */
export function builder<A>() {
  return new ChunkBuilder<A>(Chunk.empty())
}

export class ChunkBuilder<A> {
  constructor(private chunk: Chunk<A>) {}

  append(a: A): ChunkBuilder<A> {
    this.chunk = this.chunk.append(a)
    return this
  }

  build() {
    return this.chunk
  }
}
