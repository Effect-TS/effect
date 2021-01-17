import type * as B from "@effect-ts/core/Branded"
import type { Chunk } from "@effect-ts/core/Chunk"

export type Byte = B.Branded<number, "Byte">

/**
 * @optimize identity
 */
export function byte(n: number): Byte {
  return n as any
}

/**
 * @optimize identity
 */
export function chunk(buf: Buffer): Chunk<Byte> {
  return buf as any
}

/**
 * @optimize identity
 */
export function buffer(buf: Chunk<Byte>): Buffer {
  return buf as any
}
