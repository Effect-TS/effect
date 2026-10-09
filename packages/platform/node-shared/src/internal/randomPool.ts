/**
 * @internal
 */
import * as v8 from "node:v8"

const poolSize = 4096
const maxPooledSize = 256

const isBuildingSnapshot = (): boolean => {
  try {
    return v8.startupSnapshot?.isBuildingSnapshot() ?? false
  } catch {
    // Bun exposes the API but throws because it cannot build V8 snapshots.
    return false
  }
}

/**
 * Serves small random-byte requests from a reusable buffer. Each native fill
 * call costs about as much as filling the whole buffer, so batching makes
 * per-draw requests from the Crypto random helpers much cheaper.
 *
 * Every request returns a fresh copy, and consumed pool bytes are zeroed.
 *
 * @internal
 */
export const make = (fill: (bytes: Uint8Array) => void): (size: number) => Uint8Array => {
  let pool: Uint8Array | undefined
  let offset = poolSize

  const discard = (): void => {
    pool?.fill(0)
    pool = undefined
    offset = poolSize
  }

  // A pool captured in a startup snapshot would hand the same bytes to every
  // process started from it.
  if (isBuildingSnapshot()) {
    v8.startupSnapshot.addSerializeCallback(discard)
  }

  const randomBytes = (size: number): Uint8Array => {
    if (size > maxPooledSize) {
      const bytes = new Uint8Array(size)
      fill(bytes)
      return bytes
    }
    if (pool === undefined || offset + size > poolSize) {
      pool ??= new Uint8Array(poolSize)
      fill(pool)
      offset = 0
    }
    const bytes = pool.slice(offset, offset + size)
    pool.fill(0, offset, offset + size)
    offset += size
    return bytes
  }

  return randomBytes
}
