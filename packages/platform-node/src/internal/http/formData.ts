import * as FormData from "@effect/platform/Http/FormData"
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
): Stream.Stream<never, FormData.FormDataError, FormData.Part> =>
  pipe(
    FormData.makeConfig(headers as any),
    Effect.map(
      (config) =>
        NodeStream.fromReadable<FormData.FormDataError, MP.Part>(() => {
          const parser = MP.make(config)
          source.pipe(parser)
          return parser
        }, (error) => convertError(error as any))
    ),
    Stream.unwrap,
    Stream.map(convertPart)
  )

/** @internal */
export const formData = (
  source: Readable,
  headers: IncomingHttpHeaders
) =>
  FormData.formData(stream(source, headers), (path, file) =>
    Effect.tryPromise({
      try: (signal) => NodeStreamP.pipeline((file as FileImpl).file, NFS.createWriteStream(path), { signal }),
      catch: (error) => FormData.FormDataError("InternalError", error)
    }))

const convertPart = (part: MP.Part): FormData.Part =>
  part._tag === "Field" ? new FieldImpl(part.info, part.value) : new FileImpl(part)

class FieldImpl implements FormData.Field {
  readonly [FormData.TypeId]: FormData.TypeId
  readonly _tag = "Field"
  readonly key: string
  readonly contentType: string
  readonly value: string

  constructor(
    info: PartInfo,
    value: Uint8Array
  ) {
    this[FormData.TypeId] = FormData.TypeId
    this.key = info.name
    this.contentType = info.contentType
    this.value = decodeField(info, value)
  }
}

class FileImpl implements FormData.File {
  readonly _tag = "File"
  readonly [FormData.TypeId]: FormData.TypeId
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<never, FormData.FormDataError, Uint8Array>

  constructor(readonly file: MP.FileStream) {
    this[FormData.TypeId] = FormData.TypeId
    this.key = file.info.name
    this.name = file.filename ?? file.info.name
    this.contentType = file.info.contentType
    this.content = NodeStream.fromReadable(() => file, (error) => FormData.FormDataError("InternalError", error))
  }
}

/** @internal */
export const fileToReadable = (file: FormData.File): Readable => (file as FileImpl).file

function convertError(error: MultipartError): FormData.FormDataError {
  switch (error._tag) {
    case "ReachedLimit": {
      switch (error.limit) {
        case "MaxParts": {
          return FormData.FormDataError("TooManyParts", error)
        }
        case "MaxFieldSize": {
          return FormData.FormDataError("FieldTooLarge", error)
        }
        case "MaxPartSize": {
          return FormData.FormDataError("FileTooLarge", error)
        }
        case "MaxTotalSize": {
          return FormData.FormDataError("BodyTooLarge", error)
        }
      }
    }
    default: {
      return FormData.FormDataError("Parse", error)
    }
  }
}
