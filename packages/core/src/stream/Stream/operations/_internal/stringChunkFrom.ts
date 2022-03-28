import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Charset } from "./Charset"

export function stringChunkFrom(bytes: Chunk<number>, charset: Charset): Chunk<string> {
  const decoder = new TextDecoder(charset)
  switch (charset) {
    case "us-ascii":
    case "iso-8859-1":
    case "utf-8":
    case "utf-16le": {
      return Chunk.single(decoder.decode(new Uint8Array(bytes.toArrayLike())))
    }
    //   return Chunk.single(decoder.decode(new Uint16Array(bytes.toArrayLike())))
  }
}
