import type { ChunkBuilder } from "../collection/immutable/Chunk"
import { Chunk } from "../collection/immutable/Chunk"
import { TraceElement } from "../io/TraceElement"

export class StackTraceBuilder {
  private last: TraceElement | undefined = undefined

  private builder: ChunkBuilder<TraceElement> = Chunk.builder()

  append(trace: TraceElement | undefined): void {
    if (trace != null && trace !== this.last && trace !== TraceElement.empty) {
      this.builder.append(trace)
      this.last = trace
    }
  }

  build(): Chunk<TraceElement> {
    return this.builder.build()
  }
}

export function unsafeMake(): StackTraceBuilder {
  return new StackTraceBuilder()
}
