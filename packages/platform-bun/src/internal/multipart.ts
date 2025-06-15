import * as Multipart from "@effect/platform/Multipart"
import * as Channel from "effect/Channel"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Stream from "effect/Stream"
import type { MultipartError, PartInfo } from "multipasta"
import { decodeField } from "multipasta"
import * as MP from "multipasta/web"

/** @internal */
export const stream = (source: Request): Stream.Stream<Multipart.Part, Multipart.MultipartError> =>
  pipe(
    Multipart.makeConfig({}),
    Effect.map((config) => {
      const parser = MP.make({
        ...config,
        headers: source.headers
      })
      return Stream.fromReadableStream(
        () => source.body!.pipeThrough(parser),
        (cause) => convertError(cause as MultipartError)
      )
    }),
    Stream.unwrap,
    Stream.map(convertPart)
  )

/** @internal */
export const persisted = (source: Request) =>
  Multipart.toPersisted(stream(source), (path, file) =>
    Effect.tryPromise({
      try: async () => {
        const fileImpl = file as FileImpl
        const writer = Bun.file(path).writer()
        const reader = fileImpl.file.readable.getReader()
        try {
          while (true) {
            const { done, value } = await reader.readMany()
            if (done) break
            for (const chunk of value) {
              writer.write(chunk)
            }
            await writer.flush()
          }
        } finally {
          reader.cancel()
          await writer.end()
        }
      },
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

  constructor(readonly file: MP.File) {
    super()
    this.key = file.info.name
    this.name = file.info.filename ?? file.info.name
    this.contentType = file.info.contentType
    this.content = Stream.fromReadableStream(
      () => file.readable,
      (cause) => new Multipart.MultipartError({ reason: "InternalError", cause })
    )
    this.contentEffect = Stream.toChannel(this.content).pipe(
      Channel.pipeTo(Multipart.collectUint8Array),
      Channel.run,
      Effect.mapError((cause) => new Multipart.MultipartError({ reason: "InternalError", cause }))
    )
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
