import * as C from "../../Collections/Immutable/Chunk"
import type { TraceElement } from "../../TraceElement"
import * as TE from "../../TraceElement"

export class StackTraceBuilder {
  private last: TraceElement | undefined = undefined

  private builder: C.ChunkBuilder<TraceElement> = C.builder()

  append(trace: TraceElement | undefined): void {
    if (trace != null && trace !== this.last && trace !== TE.NoLocation) {
      this.builder.append(trace)
      this.last = trace
    }
  }

  build(): C.Chunk<TraceElement> {
    return this.builder.build()
  }
}

export function unsafeMake(): StackTraceBuilder {
  return new StackTraceBuilder()
}
