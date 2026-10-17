import { BufferError, type Reader } from "./buffer.ts"

/**
 * Describing a packet's layout as data.
 *
 * Most MySQL packets are a fixed sequence of fields, and writing them out as a
 * run of `reader.uint8(); reader.uint16()` calls buries that shape in control
 * flow. A packet declared here reads as its layout, and the decoded record's
 * type follows from the declaration rather than being restated.
 *
 * This covers packets whose shape is known before reading them. A length that
 * depends on an earlier field still needs a reader of its own, which `make`
 * exists for.
 *
 * @internal
 */

/** Reads one field of a packet. */
export interface Field<out A> {
  readonly read: (reader: Reader) => A
}

/** Builds a field from a reader, for shapes the combinators do not cover. */
export const make = <A>(read: (reader: Reader) => A): Field<A> => ({ read })

/** @internal */
export const uint8: Field<number> = make((reader) => reader.uint8())
/** @internal */
export const uint16: Field<number> = make((reader) => reader.uint16())
/** @internal */
export const uint32: Field<number> = make((reader) => reader.uint32())
/** @internal */
export const lenencInt: Field<number | bigint | null> = make((reader) => reader.lenencInt())
/** @internal */
export const lenencString: Field<string | null> = make((reader) => reader.lenencString())
/** @internal */
export const cString: Field<string> = make((reader) => reader.cString())
/** @internal */
export const restString: Field<string> = make((reader) => reader.restString())
/** @internal */
export const rest: Field<Uint8Array> = make((reader) => reader.rest())

/** A run of bytes of known length. */
export const bytes = (length: number): Field<Uint8Array> => make((reader) => reader.raw(length))

/** A string of known length. */
export const string = (length: number): Field<string> => make((reader) => reader.string(length))

/** Bytes the packet carries but this client does not read. */
export const skip = (length: number): Field<null> =>
  make((reader) => {
    reader.skip(length)
    return null
  })

/**
 * The byte a packet must open with. More than one is accepted where the same
 * shape has two headers, as an OK packet does.
 */
export const tag = (...accepted: ReadonlyArray<number>): Field<number> =>
  make((reader) => {
    const value = reader.uint8()
    if (!accepted.includes(value)) {
      throw new BufferError({ message: `Unexpected header 0x${value.toString(16)}` })
    }
    return value
  })

/** A field the packet only carries when bytes are left. */
export const whenPresent = <A>(inner: Field<A>): Field<A | undefined> =>
  make((reader) => reader.offset < reader.limit ? inner.read(reader) : undefined)

/** A field the packet only carries when the next byte marks it. */
export const whenByte = <A>(marker: number, inner: Field<A>): Field<A | undefined> =>
  make((reader) =>
    reader.offset < reader.limit && reader.bytes[reader.offset] === marker ? inner.read(reader) : undefined
  )

/** @internal */
export type Shape = Record<string, Field<any>>

/** What a declared packet decodes to. */
export type Decoded<S extends Shape> = {
  readonly [K in keyof S]: S[K] extends Field<infer A> ? A : never
}

/**
 * Turns a declaration into a decoder.
 *
 * The reader is supplied by the caller so one instance can be reused across
 * packets, which is why this does not own one.
 */
export const decoder = <S extends Shape>(shape: S): (reader: Reader, payload: Uint8Array) => Decoded<S> => {
  const fields = Object.entries(shape)
  return (reader, payload) => {
    reader.reset(payload, 0, payload.length)
    const decoded: Record<string, unknown> = {}
    for (let index = 0; index < fields.length; index++) {
      decoded[fields[index][0]] = fields[index][1].read(reader)
    }
    return decoded as Decoded<S>
  }
}
