// Vendored from multipasta v0.2.8. Copyright (c) 2023-present The Contributors. MIT licensed.

import type * as HeadersParser from "./headersParserApi.ts"
import * as internal from "./multipart.ts"

export interface PartInfo {
  readonly name: string
  readonly filename?: string | undefined
  readonly contentType: string
  readonly contentTypeParameters: Record<string, string>
  readonly contentDisposition: string
  readonly contentDispositionParameters: Record<string, string>
  readonly headers: Record<string, string | Array<string>>
}

export type MultipartError =
  | {
      readonly _tag: "InvalidBoundary"
    }
  | {
      readonly _tag: "BadHeaders"
      readonly error: HeadersParser.Failure
    }
  | {
      readonly _tag: "InvalidDisposition"
    }
  | {
      readonly _tag: "ReachedLimit"
      readonly limit:
        | "MaxParts"
        | "MaxTotalSize"
        | "MaxPartSize"
        | "MaxFieldSize"
    }
  | {
      readonly _tag: "EndNotReached"
    }

export type BaseConfig = {
  readonly headers: Record<string, string>
  readonly isFile?: ((info: PartInfo) => boolean) | undefined
  readonly maxParts?: number | undefined
  readonly maxTotalSize?: number | undefined
  readonly maxPartSize?: number | undefined
  readonly maxFieldSize?: number | undefined
}

export type Config = BaseConfig & {
  readonly onField: (info: PartInfo, value: Uint8Array) => void
  readonly onFile: (info: PartInfo) => (chunk: Uint8Array | null) => void
  readonly onError: (error: MultipartError) => void
  readonly onDone: () => void
}
export interface Parser {
  readonly write: (chunk: Uint8Array) => void
  readonly end: () => void
}

export const make: (options: Config) => Parser = internal.make

export const defaultIsFile: (info: PartInfo) => boolean = internal.defaultIsFile

export const decodeField: (info: PartInfo, value: Uint8Array) => string =
  internal.decodeField
