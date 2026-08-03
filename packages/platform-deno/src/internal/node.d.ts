// Minimal typings for the Node.js compatibility modules used by
// DenoHttpPlatform. Deno resolves `node:` specifiers with its own types; this
// file only exists for the TypeScript build, which compiles this package with
// Deno types where the `node:` modules are unavailable.

declare module "node:stream" {
  export class Readable {
    static fromWeb(stream: unknown): Readable
    static toWeb(stream: Readable): unknown
    on(event: "error", listener: (cause: unknown) => void): this
    on(event: "close", listener: () => void): this
    pipe<T>(destination: T): T
    destroy(cause?: unknown): void
  }
  export class Duplex extends Readable {
    destroy(cause?: unknown): void
  }
}

declare module "node:zlib" {
  import type { Duplex } from "node:stream"

  export interface BrotliOptions {
    readonly flush?: number | undefined
    readonly params?: Record<number, number> | undefined
  }
  export interface ZstdOptions {
    readonly flush?: number | undefined
    readonly params?: Record<number, number> | undefined
  }
  export interface ZlibCompressOptions {
    readonly level?: number | undefined
  }
  export type CompressCallback = (error: Error | null, result: Uint8Array) => void

  export const constants: {
    readonly BROTLI_PARAM_QUALITY: number
    readonly BROTLI_PARAM_SIZE_HINT: number
    readonly BROTLI_OPERATION_FLUSH: number
    readonly ZSTD_c_compressionLevel: number
    readonly ZSTD_e_flush: number
  }

  export const gzip: (data: Uint8Array, options: ZlibCompressOptions, callback: CompressCallback) => void
  export const deflate: (data: Uint8Array, options: ZlibCompressOptions, callback: CompressCallback) => void
  export const brotliCompress: (data: Uint8Array, options: BrotliOptions, callback: CompressCallback) => void
  export function zstdCompress(data: Uint8Array, callback: CompressCallback): void
  export function zstdCompress(data: Uint8Array, options: ZstdOptions, callback: CompressCallback): void
  export const createBrotliCompress: (options?: BrotliOptions) => Duplex
  export const createZstdCompress: (options?: ZstdOptions) => Duplex
}
