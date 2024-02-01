import * as Multipart from "@effect/platform/Http/Multipart"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"
import type { MultipartError, PartInfo } from "multipasta"
import { decodeField } from "multipasta"
import * as MP from "multipasta/node"
import * as NFS from "node:fs"
import type { IncomingHttpHeaders } from "node:http"
import type { Readable } from "node:stream"
import * as NodeStreamP from "node:stream/promises"
import * as NodeStream from "../stream.js"

/** @internal */
export const stream = (
  source: Readable,
  headers: IncomingHttpHeaders
): Stream.Stream<never, Multipart.MultipartError, Multipart.Part> =>
  pipe(
    Multipart.makeConfig(headers as any),
    Effect.map(
      (config) =>
        NodeStream.fromReadable<Multipart.MultipartError, MP.Part>(() => {
          const parser = MP.make(config)
          source.pipe(parser)
          return parser
        }, (error) => convertError(error as any))
    ),
    Stream.unwrap,
    Stream.map(convertPart)
  )

/** @internal */
export const persisted = (
  source: Readable,
  headers: IncomingHttpHeaders
) =>
  Multipart.toPersisted(stream(source, headers), (path, file) =>
    Effect.tryPromise({
      try: (signal) => NodeStreamP.pipeline((file as FileImpl).file, NFS.createWriteStream(path), { signal }),
      catch: (error) => Multipart.MultipartError("InternalError", error)
    }))

const convertPart = (part: MP.Part): Multipart.Part =>
  part._tag === "Field" ? new FieldImpl(part.info, part.value) : new FileImpl(part)

class FieldImpl implements Multipart.Field {
  readonly [Multipart.TypeId]: Multipart.TypeId
  readonly _tag = "Field"
  readonly key: string
  readonly contentType: string
  readonly value: string

  constructor(
    info: PartInfo,
    value: Uint8Array
  ) {
    this[Multipart.TypeId] = Multipart.TypeId
    this.key = info.name
    this.contentType = info.contentType
    this.value = decodeField(info, value)
  }
}

class FileImpl implements Multipart.File {
  readonly _tag = "File"
  readonly [Multipart.TypeId]: Multipart.TypeId
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<never, Multipart.MultipartError, Uint8Array>

  constructor(readonly file: MP.FileStream) {
    this[Multipart.TypeId] = Multipart.TypeId
    this.key = file.info.name
    this.name = file.filename ?? file.info.name
    this.contentType = file.info.contentType
    this.content = NodeStream.fromReadable(() => file, (error) => Multipart.MultipartError("InternalError", error))
  }
}

/** @internal */
export const fileToReadable = (file: Multipart.File): Readable => (file as FileImpl).file

function convertError(error: MultipartError): Multipart.MultipartError {
  switch (error._tag) {
    case "ReachedLimit": {
      switch (error.limit) {
        case "MaxParts": {
          return Multipart.MultipartError("TooManyParts", error)
        }
        case "MaxFieldSize": {
          return Multipart.MultipartError("FieldTooLarge", error)
        }
        case "MaxPartSize": {
          return Multipart.MultipartError("FileTooLarge", error)
        }
        case "MaxTotalSize": {
          return Multipart.MultipartError("BodyTooLarge", error)
        }
      }
    }
    default: {
      return Multipart.MultipartError("Parse", error)
    }
  }
}
