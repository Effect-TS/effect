// Vendored from multipasta v0.2.8. Copyright (c) 2023-present The Contributors. MIT licensed.

import * as internal from "./search.ts"

export const make: (
  needle: string,
  callback: (index: number, chunk: Uint8Array) => void,
) => { readonly write: (chunk: Uint8Array) => void; readonly end: () => void } =
  internal.make
