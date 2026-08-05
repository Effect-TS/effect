// Vendored from multipasta v0.2.8. Copyright (c) 2023-present The Contributors. MIT licensed.

import type { BaseConfig, MultipartError, PartInfo } from "./index.ts"
import { make as makeParser } from "./multipart.ts"

export type { MultipartError, PartInfo } from "./index.ts"
export { decodeField } from "./index.ts"

export type Part = Field | File

export interface Field {
  readonly _tag: "Field"
  readonly info: PartInfo
  readonly value: Uint8Array
}

export interface File {
  readonly _tag: "File"
  readonly info: PartInfo
  readonly readable: ReadableStream<Uint8Array>
}

export interface MultipastaStream {
  readonly writable: WritableStream<Uint8Array>
  readonly readable: ReadableStream<Part>
}

export type WebConfig = Omit<BaseConfig, "headers"> & {
  readonly headers: Headers
}

export const make = (config: WebConfig): MultipastaStream => {
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
            return new Promise<void>(resolve => {
              chunkResolve = () => {
                chunkResolve = undefined
                resolve()
              }
            }).then(() => this.pull!(controller))
          }
        },
      })

      partBuffer.push({ _tag: "File", info, readable })
      if (readResolve !== undefined) readResolve()

      return function (chunk) {
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
    },
  })

  const writable = new WritableStream<Uint8Array>({
    write(chunk, _controller) {
      parser.write(chunk)
    },
    close() {
      parser.end()
    },
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
        return new Promise<void>(resolve => {
          readResolve = () => {
            readResolve = undefined
            resolve()
          }
        }).then(() => this.pull!(controller))
      }
    },
  })

  return {
    writable,
    readable,
  }
}
