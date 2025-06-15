import * as Multipart from "@effect/platform/Multipart"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Stream from "effect/Stream"
import type { MultipartError, PartInfo } from "multipasta"
import { decodeField } from "multipasta"
import * as MP from "multipasta/node"
import * as NFS from "node:fs"
import type { IncomingHttpHeaders } from "node:http"
import type { Readable } from "node:stream"
import * as NodeStreamP from "node:stream/promises"
import * as NodeStream from "./stream.js"

/** @internal */
export const stream = (
  source: Readable,
  headers: IncomingHttpHeaders
): Stream.Stream<Multipart.Part, Multipart.MultipartError> =>
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
      catch: (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })
    }))

const convertPart = (part: MP.Part): Multipart.Part =>
  part._tag === "Field" ? new FieldImpl(part.info, part.value) : new FileImpl(part)

abstract class PartBase extends Inspectable.Class {
  readonly [Multipart.TypeId]: Multipart.TypeId
  constructor() {
    super()
    this[Multipart.TypeId] = Multipart.TypeId
  }
}

class FieldImpl extends PartBase implements Multipart.Field {
  readonly _tag = "Field"
  readonly key: string
  readonly contentType: string
  readonly value: string

  constructor(
    info: PartInfo,
    value: Uint8Array
  ) {
    super()
    this.key = info.name
    this.contentType = info.contentType
    this.value = decodeField(info, value)
  }

  toJSON(): unknown {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "Field",
      key: this.key,
      value: this.value,
      contentType: this.contentType
    }
  }
}

class FileImpl extends PartBase implements Multipart.File {
  readonly _tag = "File"
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<Uint8Array, Multipart.MultipartError>
  readonly contentEffect: Effect.Effect<Uint8Array, Multipart.MultipartError>

  constructor(readonly file: MP.FileStream) {
    super()
    this.key = file.info.name
    this.name = file.filename ?? file.info.name
    this.contentType = file.info.contentType
    this.content = NodeStream.fromReadable(
      () => file,
      (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })
    )
    this.contentEffect = NodeStream.toUint8Array(() => file, {
      onFailure: (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })
    })
  }

  toJSON(): unknown {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "File",
      key: this.key,
      name: this.name,
      contentType: this.contentType
    }
  }
}

/** @internal */
export const fileToReadable = (file: Multipart.File): Readable => (file as FileImpl).file

function convertError(cause: MultipartError): Multipart.MultipartError {
  switch (cause._tag) {
    case "ReachedLimit": {
      switch (cause.limit) {
        case "MaxParts": {
          return new Multipart.MultipartError({ reason: "TooManyParts", cause })
        }
        case "MaxFieldSize": {
          return new Multipart.MultipartError({ reason: "FieldTooLarge", cause })
        }
        case "MaxPartSize": {
          return new Multipart.MultipartError({ reason: "FileTooLarge", cause })
        }
        case "MaxTotalSize": {
          return new Multipart.MultipartError({ reason: "BodyTooLarge", cause })
        }
      }
    }
    default: {
      return new Multipart.MultipartError({ reason: "Parse", cause })
    }
  }
}
