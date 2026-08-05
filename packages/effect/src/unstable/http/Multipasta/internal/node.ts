// Vendored from multipasta v0.2.8. Copyright (c) 2023-present The Contributors. MIT licensed.

/// <reference types="node" />
import type { IncomingHttpHeaders } from "node:http"
import { Duplex, Readable } from "node:stream"
import type { BaseConfig, MultipartError, Parser, PartInfo } from "./index.ts"
import { make as makeParser } from "./multipart.ts"

export type { MultipartError, PartInfo } from "./index.ts"
export { decodeField } from "./index.ts"

export type Part = Field | FileStream

export interface Field {
  readonly _tag: "Field"
  readonly info: PartInfo
  readonly value: Uint8Array
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export interface MultipastaStream extends Duplex {
  [Symbol.asyncIterator](): NodeJS.AsyncIterator<Part>

  on(event: "field", listener: (field: Field) => void): this
  on(event: "file", listener: (file: FileStream) => void): this
  on(event: "close", listener: () => void): this
  on(event: "data", listener: (part: Part) => void): this
  on(event: "drain", listener: () => void): this
  on(event: "end", listener: () => void): this
  on(event: "error", listener: (err: MultipartError) => void): this
  on(event: "finish", listener: () => void): this
  on(event: "pause", listener: () => void): this
  on(event: "pipe", listener: (src: Readable) => void): this
  on(event: "readable", listener: () => void): this
  on(event: "resume", listener: () => void): this
  on(event: "unpipe", listener: (src: Readable) => void): this
  on(event: string | symbol, listener: (...args: Array<any>) => void): this

  read(size?: number): Part | null
}

export type NodeConfig = Omit<BaseConfig, "headers"> & {
  readonly headers: IncomingHttpHeaders
}

// oxlint-disable-next-line typescript/no-unsafe-declaration-merging
export class MultipastaStream extends Duplex {
  private _parser: Parser
  _canWrite = true
  private _writeCallback: (() => void) | undefined

  constructor(config: NodeConfig) {
    super({ readableObjectMode: true })
    let currentError: MultipartError | undefined
    let currentFile: FileStream | undefined
    this._parser = makeParser({
      ...(config as any),
      onField: (info, value) => {
        if (currentError !== undefined) return
        const field: Field = { _tag: "Field", info, value }
        this.push(field)
        this.emit("field", field)
      },
      onFile: info => {
        if (currentError !== undefined) return _ => {}
        const file = new FileStream(info, this)
        currentFile = file
        this.push(file)
        this.emit("file", file)
        return chunk => {
          this._canWrite = file.push(chunk)
          if (chunk === null && !this._canWrite) {
            currentFile = undefined
            this._resume()
          }
        }
      },
      onError: error => {
        this.emit("error", error)
        currentFile?.emit("error", error)
        currentError = error
      },
      onDone: () => {
        this.push(null)
      },
    })
  }

  _resume() {
    this._canWrite = true
    if (this._writeCallback !== undefined) {
      const callback = this._writeCallback
      this._writeCallback = undefined
      callback()
    }
  }

  override _read(_size: number) {}

  override _write(
    chunk: any,
    encoding: BufferEncoding,
    callback: (error?: Error | null | undefined) => void,
  ): void {
    this._parser.write(
      chunk instanceof Uint8Array ? chunk : Buffer.from(chunk, encoding),
    )
    if (this._canWrite) {
      callback()
    } else {
      this._writeCallback = callback
    }
  }

  override _final(callback: (error?: Error | null | undefined) => void): void {
    this._parser.end()
    callback()
  }
}

export const make = (config: NodeConfig): MultipastaStream =>
  new MultipastaStream(config)

export class FileStream extends Readable {
  readonly _tag = "File"
  readonly filename: string
  readonly info: PartInfo
  private _parent: MultipastaStream
  constructor(
    info: PartInfo,
    parent: MultipastaStream,
  ) {
    super()
    this.info = info
    this._parent = parent
    this.filename = info.filename!
  }
  override _read(_size: number) {
    if (this._parent._canWrite === false) {
      this._parent._resume()
    }
  }
}
