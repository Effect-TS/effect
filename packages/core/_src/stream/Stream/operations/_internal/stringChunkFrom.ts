import type { Charset } from "@effect/core/stream/Stream/operations/_internal/Charset"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { TextDecoder } from "util"

export function stringChunkFrom(bytes: Chunk<number>, charset: Charset): Chunk<string> {
  // @ts-expect-error
  const decoder: TextDecoder = new TextDecoder(charset)
  switch (charset) {
    case "us-ascii":
    case "iso-8859-1":
    case "utf-8":
    case "utf-16le": {
      return Chunk.single(decoder.decode(new Uint8Array(bytes)))
    }
  }
}
