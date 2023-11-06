---
title: Encoding.ts
nav_order: 26
parent: Modules
---

## Encoding overview

This module provides encoding & decoding functionality for:

- base64 (RFC4648)
- base64 (URL)
- hex

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [decoding](#decoding)
  - [decodeBase64](#decodebase64)
  - [decodeBase64String](#decodebase64string)
  - [decodeBase64Url](#decodebase64url)
  - [decodeBase64UrlString](#decodebase64urlstring)
  - [decodeHex](#decodehex)
  - [decodeHexString](#decodehexstring)
- [encoding](#encoding)
  - [encodeBase64](#encodebase64)
  - [encodeBase64Url](#encodebase64url)
  - [encodeHex](#encodehex)
- [errors](#errors)
  - [DecodeException](#decodeexception)
- [models](#models)
  - [DecodeException (interface)](#decodeexception-interface)
- [refinements](#refinements)
  - [isDecodeException](#isdecodeexception)
- [symbols](#symbols)
  - [DecodeExceptionTypeId](#decodeexceptiontypeid)
  - [DecodeExceptionTypeId (type alias)](#decodeexceptiontypeid-type-alias)

---

# decoding

## decodeBase64

Decodes a base64 (RFC4648) encoded `string` into a `Uint8Array`.

**Signature**

```ts
export declare const decodeBase64: (str: string) => Either<DecodeException, Uint8Array>
```

Added in v2.0.0

## decodeBase64String

Decodes a base64 (RFC4648) encoded `string` into a UTF-8 `string`.

**Signature**

```ts
export declare const decodeBase64String: (str: string) => Either<DecodeException, string>
```

Added in v2.0.0

## decodeBase64Url

Decodes a base64 (URL) encoded `string` into a `Uint8Array`.

**Signature**

```ts
export declare const decodeBase64Url: (str: string) => Either<DecodeException, Uint8Array>
```

Added in v2.0.0

## decodeBase64UrlString

Decodes a base64 (URL) encoded `string` into a UTF-8 `string`.

**Signature**

```ts
export declare const decodeBase64UrlString: (str: string) => Either<DecodeException, string>
```

Added in v2.0.0

## decodeHex

Decodes a hex encoded `string` into a `Uint8Array`.

**Signature**

```ts
export declare const decodeHex: (str: string) => Either<DecodeException, Uint8Array>
```

Added in v2.0.0

## decodeHexString

Decodes a hex encoded `string` into a UTF-8 `string`.

**Signature**

```ts
export declare const decodeHexString: (str: string) => Either<DecodeException, string>
```

Added in v2.0.0

# encoding

## encodeBase64

Encodes the given value into a base64 (RFC4648) `string`.

**Signature**

```ts
export declare const encodeBase64: (input: Uint8Array | string) => string
```

Added in v2.0.0

## encodeBase64Url

Encodes the given value into a base64 (URL) `string`.

**Signature**

```ts
export declare const encodeBase64Url: (input: Uint8Array | string) => string
```

Added in v2.0.0

## encodeHex

Encodes the given value into a hex `string`.

**Signature**

```ts
export declare const encodeHex: (input: Uint8Array | string) => string
```

Added in v2.0.0

# errors

## DecodeException

Creates a checked exception which occurs when decoding fails.

**Signature**

```ts
export declare const DecodeException: (input: string, message?: string) => DecodeException
```

Added in v2.0.0

# models

## DecodeException (interface)

Represents a checked exception which occurs when decoding fails.

**Signature**

```ts
export interface DecodeException {
  readonly _tag: "DecodeException"
  readonly [DecodeExceptionTypeId]: DecodeExceptionTypeId
  readonly input: string
  readonly message?: string
}
```

Added in v2.0.0

# refinements

## isDecodeException

Returns `true` if the specified value is an `DecodeException`, `false` otherwise.

**Signature**

```ts
export declare const isDecodeException: (u: unknown) => u is DecodeException
```

Added in v2.0.0

# symbols

## DecodeExceptionTypeId

**Signature**

```ts
export declare const DecodeExceptionTypeId: typeof DecodeExceptionTypeId
```

Added in v2.0.0

## DecodeExceptionTypeId (type alias)

**Signature**

```ts
export type DecodeExceptionTypeId = typeof DecodeExceptionTypeId
```

Added in v2.0.0
