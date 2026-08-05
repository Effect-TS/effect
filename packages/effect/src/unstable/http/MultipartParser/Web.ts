/**
 * Web Streams adapter for the low-level multipart parser.
 *
 * @since 4.0.0
 */
import type { BaseConfig, MultipartError, PartInfo } from "../MultipartParser.ts"
import { make as makeParser } from "./internal/multipart.ts"

export type {
  /**
   * Re-exports the multipart parser error type.
   *
   * @category re-exports
   * @since 4.0.0
   */
  MultipartError,
  /**
   * Re-exports the multipart part metadata type.
   *
   * @category re-exports
   * @since 4.0.0
   */
  PartInfo
} from "../MultipartParser.ts"

export {
  /**
   * Re-exports the multipart field decoder.
   *
   * @category re-exports
   * @since 4.0.0
   */
  decodeField
} from "../MultipartParser.ts"

/**
 * A part emitted by the Web Streams multipart parser.
 *
 * @category models
 * @since 4.0.0
 */
export type Part = Field | File

/**
 * A parsed multipart field.
 *
 * @category models
 * @since 4.0.0
 */
export interface Field {
  readonly _tag: "Field"
  readonly info: PartInfo
  readonly value: Uint8Array
}

/**
 * A parsed multipart file backed by a readable stream.
 *
 * @category models
 * @since 4.0.0
 */
export interface File {
  readonly _tag: "File"
  readonly info: PartInfo
  readonly readable: ReadableStream<Uint8Array>
}

/**
 * Web Streams interface for multipart input and parsed parts.
 *
 * @category models
 * @since 4.0.0
 */
export interface MultipartStream {
  readonly writable: WritableStream<Uint8Array>
  readonly readable: ReadableStream<Part>
}

/**
 * Configuration for the Web Streams multipart parser.
 *
 * @category models
 * @since 4.0.0
 */
export type WebConfig = Omit<BaseConfig, "headers"> & {
  readonly headers: Headers
}

/**
 * Creates a Web Streams multipart parser.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = (config: WebConfig): MultipartStream => {
  const headers = Object.fromEntries(config.headers)
  let error: MultipartError | undefined
  let partBuffer: Array<Part> = []
  let readResolve: (() => void) | undefined
  let chunkResolve: (() => void) | undefined
  let finished = false

  const parser = makeParser({
    ...config,
    headers,
    onField(info, value) {
      partBuffer.push({ _tag: "Field", info, value })
      if (readResolve !== undefined) readResolve()
    },
    onFile(info) {
      let chunkBuffer: Array<Uint8Array> = []
      let finished = false

      const readable = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (chunkBuffer.length > 0) {
            const chunks = chunkBuffer
            chunkBuffer = []
            for (const chunk of chunks) {
              controller.enqueue(chunk)
            }
          } else if (error) {
            controller.error(error)
          } else if (finished) {
            controller.close()
          } else {
            return new Promise<void>((resolve) => {
              chunkResolve = () => {
                chunkResolve = undefined
                resolve()
              }
            }).then(() => this.pull!(controller))
          }
        }
      })

      partBuffer.push({ _tag: "File", info, readable })
      if (readResolve !== undefined) readResolve()

      return function(chunk) {
        if (chunk === null) {
          finished = true
        } else {
          chunkBuffer.push(chunk)
        }
        if (chunkResolve !== undefined) {
          chunkResolve()
        }
      }
    },
    onError(error_) {
      if (error !== undefined) return
      error = error_
      if (chunkResolve !== undefined) chunkResolve()
      if (readResolve !== undefined) readResolve()
    },

    onDone() {
      finished = true
      if (readResolve !== undefined) readResolve()
    }
  })

  const writable = new WritableStream<Uint8Array>({
    write(chunk, _controller) {
      parser.write(chunk)
    },
    close() {
      parser.end()
    }
  })

  const readable = new ReadableStream<Part>({
    pull(controller) {
      if (partBuffer.length > 0) {
        const parts = partBuffer
        partBuffer = []
        for (const part of parts) {
          controller.enqueue(part)
        }
      } else if (error) {
        controller.error(error)
      } else if (finished) {
        controller.close()
      } else {
        return new Promise<void>((resolve) => {
          readResolve = () => {
            readResolve = undefined
            resolve()
          }
        }).then(() => this.pull!(controller))
      }
    }
  })

  return {
    writable,
    readable
  }
}
