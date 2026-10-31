/**
 * Builds PDF documents from pages of text, shapes, images and links, and
 * encodes them to bytes.
 *
 * Documents are plain data: {@link document} holds {@link page}s, and each
 * page holds a list of content items drawn in order, so later items paint over
 * earlier ones. {@link encode} writes the document as a PDF 1.4 file.
 *
 * Positions and sizes are in points (1/72 inch), measured from the top-left
 * corner of the page with `y` growing downwards.
 *
 * Text uses the twelve Latin standard fonts that every PDF reader provides
 * (Helvetica, Times and Courier, each in four styles), so no font files are
 * embedded. These fonts cover the WinAnsiEncoding character set (Windows code
 * page 1252): ASCII, Latin-1 and a few typographic symbols such as `€`, `–`
 * and `“`. {@link measureText} returns the width of text and wraps it to a
 * maximum width, using the same metrics as the readers.
 *
 * Images are JPEG and PNG files decoded by {@link decodeImage}. JPEG data is
 * embedded as is; PNG pixels are decoded, including transparency.
 *
 * Content streams and PNG pixels are compressed with the runtime's
 * `CompressionStream("deflate")` unless `compress: false` is passed to
 * {@link encode}. Embedded fonts, kerning, encryption and reading existing PDF
 * files are not supported.
 *
 * This module is experimental and may receive breaking changes in patch
 * releases.
 *
 * **Example** (Writing a one-page document)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Pdf } from "effect/encoding"
 *
 * const doc = Pdf.document([
 *   Pdf.page([
 *     Pdf.text("Invoice #42", { x: 72, y: 72, font: "Helvetica-Bold", size: 24 }),
 *     Pdf.line({ x1: 72, y1: 108, x2: 523, y2: 108, lineWidth: 0.5 }),
 *     Pdf.rect({ x: 72, y: 124, width: 451, height: 48, fill: Pdf.hex("#f2f2f2") }),
 *     Pdf.text("Thank you for your business.", { x: 84, y: 140 })
 *   ])
 * ], { title: "Invoice #42" })
 *
 * const bytes = await Effect.runPromise(Pdf.encode(doc))
 * new TextDecoder().decode(bytes.subarray(0, 8)) // => "%PDF-1.4"
 * ```
 *
 * @stability experimental
 * @since 4.1.0
 */
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import { ByteQueue, InflateError, InflateMemory, Inflater, NeedInput } from "../internal/inflate.ts"
import * as Fonts from "../internal/pdfFonts.ts"
import * as Predicate from "../Predicate.ts"

const PdfErrorTypeId = "~effect/encoding/Pdf/PdfError"

/**
 * Error raised when an image cannot be decoded or a document cannot be
 * encoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `InvalidImage`: the bytes are not a JPEG or PNG file, or the file is
 *   corrupt or truncated.
 * - `InvalidValue`: a document has a value that cannot be written, such as
 *   a negative size, a non-finite coordinate, a color component outside 0 to
 *   1, or no pages.
 * - `Unsupported`: the input uses a feature this module does not write, such
 *   as a character outside WinAnsiEncoding or a 12-bit JPEG.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.0
 */
export class PdfError extends Data.TaggedError("PdfError")<{
  readonly kind: "InvalidImage" | "InvalidValue" | "Unsupported"
  readonly message: string
}> {
  /**
   * Marks this value as a PDF error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.0
   */
  readonly [PdfErrorTypeId] = PdfErrorTypeId
}

/**
 * Checks whether a value is a `PdfError`.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.0
 */
export const isPdfError = (u: unknown): u is PdfError => Predicate.hasProperty(u, PdfErrorTypeId)

// -----------------------------------------------------------------------------
// Fonts
// -----------------------------------------------------------------------------

/**
 * Standard PDF font that every reader provides without embedding.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export type Font =
  | "Helvetica"
  | "Helvetica-Bold"
  | "Helvetica-Oblique"
  | "Helvetica-BoldOblique"
  | "Times-Roman"
  | "Times-Bold"
  | "Times-Italic"
  | "Times-BoldItalic"
  | "Courier"
  | "Courier-Bold"
  | "Courier-Oblique"
  | "Courier-BoldOblique"

interface FontMetrics {
  readonly widths: ReadonlyArray<number> | undefined
  readonly ascent: number
  readonly descent: number
}

const fontMetrics: Record<Font, FontMetrics> = {
  "Helvetica": { widths: Fonts.helvetica, ...Fonts.verticalMetrics.Helvetica },
  "Helvetica-Bold": { widths: Fonts.helveticaBold, ...Fonts.verticalMetrics.Helvetica },
  "Helvetica-Oblique": { widths: Fonts.helvetica, ...Fonts.verticalMetrics.Helvetica },
  "Helvetica-BoldOblique": { widths: Fonts.helveticaBold, ...Fonts.verticalMetrics.Helvetica },
  "Times-Roman": { widths: Fonts.timesRoman, ...Fonts.verticalMetrics.Times },
  "Times-Bold": { widths: Fonts.timesBold, ...Fonts.verticalMetrics.Times },
  "Times-Italic": { widths: Fonts.timesItalic, ...Fonts.verticalMetrics.Times },
  "Times-BoldItalic": { widths: Fonts.timesBoldItalic, ...Fonts.verticalMetrics.Times },
  // Every Courier glyph is 600 wide
  "Courier": { widths: undefined, ...Fonts.verticalMetrics.Courier },
  "Courier-Bold": { widths: undefined, ...Fonts.verticalMetrics.Courier },
  "Courier-Oblique": { widths: undefined, ...Fonts.verticalMetrics.Courier },
  "Courier-BoldOblique": { widths: undefined, ...Fonts.verticalMetrics.Courier }
}

const isFont = (font: string): font is Font => Object.hasOwn(fontMetrics, font)

const winAnsiFromUnicode: ReadonlyMap<number, number> = new Map(
  Fonts.winAnsiHigh.flatMap((codePoint, i) => codePoint === 0 ? [] : [[codePoint, 128 + i] as const])
)

// Returns the WinAnsiEncoding code of a code point, or -1 when it has none
const winAnsiCode = (codePoint: number): number => {
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint
  return winAnsiFromUnicode.get(codePoint) ?? -1
}

const glyphWidth = (metrics: FontMetrics, code: number): number =>
  code < 0 ? 0 : metrics.widths === undefined ? 600 : metrics.widths[code - 32]

const lineWidthOf = (metrics: FontMetrics, line: string, size: number): number => {
  let width = 0
  for (const char of line) width += glyphWidth(metrics, winAnsiCode(char.codePointAt(0)!))
  return width * size / 1000
}

// -----------------------------------------------------------------------------
// Colors
// -----------------------------------------------------------------------------

/**
 * Color used to fill or stroke content.
 *
 * **Details**
 *
 * Components range from 0 to 1. `Gray` uses DeviceGray, where 0 is black;
 * `Rgb` uses DeviceRGB; `Cmyk` uses DeviceCMYK, where 1 is full ink.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export type Color =
  | { readonly _tag: "Gray"; readonly gray: number }
  | { readonly _tag: "Rgb"; readonly red: number; readonly green: number; readonly blue: number }
  | {
    readonly _tag: "Cmyk"
    readonly cyan: number
    readonly magenta: number
    readonly yellow: number
    readonly black: number
  }

/**
 * Creates a gray color from a level between 0 (black) and 1 (white).
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const gray = (gray: number): Color => ({ _tag: "Gray", gray })

/**
 * Creates an RGB color from components between 0 and 1.
 *
 * @see {@link hex} for colors written as hexadecimal strings
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const rgb = (red: number, green: number, blue: number): Color => ({ _tag: "Rgb", red, green, blue })

/**
 * Creates a CMYK color from ink amounts between 0 and 1.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const cmyk = (cyan: number, magenta: number, yellow: number, black: number): Color => ({
  _tag: "Cmyk",
  cyan,
  magenta,
  yellow,
  black
})

/**
 * Creates an RGB color from a hexadecimal string such as `"#1e90ff"` or
 * `"#fff"`.
 *
 * **Gotchas**
 *
 * The leading `#` is optional. A string that is not three or six hexadecimal
 * digits creates a color that {@link encode} rejects with an `InvalidValue`
 * `PdfError`.
 *
 * **Example** (Parsing a short hexadecimal color)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * Pdf.hex("#f00") // => Pdf.rgb(1, 0, 0)
 * ```
 *
 * @see {@link rgb} for colors given as components
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const hex = (value: string): Color => {
  const digits = value.startsWith("#") ? value.slice(1) : value
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(digits)) return rgb(Number.NaN, Number.NaN, Number.NaN)
  const full = digits.length === 3 ? digits.replace(/./g, "$&$&") : digits
  return rgb(
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255
  )
}

/**
 * Black, the default color of text, lines and shapes.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const black: Color = gray(0)

/**
 * White.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const white: Color = gray(1)

// -----------------------------------------------------------------------------
// Page sizes
// -----------------------------------------------------------------------------

/**
 * Width and height of a page in points.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface PageSize {
  readonly width: number
  readonly height: number
}

/**
 * ISO A3 page size, 297 × 420 mm, in portrait orientation.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const A3: PageSize = { width: 841.89, height: 1190.55 }

/**
 * ISO A4 page size, 210 × 297 mm, in portrait orientation, used by pages by
 * default.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const A4: PageSize = { width: 595.28, height: 841.89 }

/**
 * ISO A5 page size, 148 × 210 mm, in portrait orientation.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const A5: PageSize = { width: 419.53, height: 595.28 }

/**
 * US Letter page size, 8.5 × 11 inches, in portrait orientation.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const Letter: PageSize = { width: 612, height: 792 }

/**
 * US Legal page size, 8.5 × 14 inches, in portrait orientation.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.0
 */
export const Legal: PageSize = { width: 612, height: 1008 }

/**
 * Returns a page size in landscape orientation, with its longer side as the
 * width.
 *
 * **Example** (Using A4 in landscape)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * Pdf.landscape(Pdf.A4) // => { width: 841.89, height: 595.28 }
 * ```
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.0
 */
export const landscape = (size: PageSize): PageSize =>
  size.width >= size.height ? size : { width: size.height, height: size.width }

// -----------------------------------------------------------------------------
// Images
// -----------------------------------------------------------------------------

const ImageTypeId = "~effect/encoding/Pdf/Image"

/**
 * Decoded JPEG or PNG image that {@link image} draws on a page.
 *
 * **Details**
 *
 * `width` and `height` are the pixel dimensions of the image. An image drawn
 * several times in a document is embedded once.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Image {
  readonly [ImageTypeId]: typeof ImageTypeId
  readonly format: "Jpeg" | "Png"
  readonly width: number
  readonly height: number
}

type ImageData =
  | {
    readonly _tag: "Jpeg"
    readonly bytes: Uint8Array
    readonly colorSpace: "DeviceGray" | "DeviceRGB" | "DeviceCMYK"
    readonly invert: boolean
  }
  | {
    readonly _tag: "Pixels"
    readonly colorSpace: "DeviceGray" | "DeviceRGB"
    readonly color: Uint8Array
    readonly alpha: Uint8Array | undefined
  }

class ImageImpl implements Image {
  readonly [ImageTypeId] = ImageTypeId
  readonly format: "Jpeg" | "Png"
  readonly width: number
  readonly height: number
  readonly data: ImageData
  constructor(format: "Jpeg" | "Png", width: number, height: number, data: ImageData) {
    this.format = format
    this.width = width
    this.height = height
    this.data = data
  }
}

const invalidImage = (message: string) => new PdfError({ kind: "InvalidImage", message })
const unsupported = (message: string) => new PdfError({ kind: "Unsupported", message })
const invalidValue = (message: string) => new PdfError({ kind: "InvalidValue", message })

/**
 * Decodes a JPEG or PNG file so that it can be drawn with {@link image}.
 *
 * **Details**
 *
 * The format is detected from the file signature. JPEG files are embedded as
 * they are, without recompression; grayscale, RGB and CMYK JPEGs with 8 bits
 * per sample are supported, baseline or progressive. PNG files of every color
 * type, bit depth and interlace method are decoded to 8-bit samples; their
 * alpha channel or transparent color becomes a soft mask.
 *
 * **Gotchas**
 *
 * - Bytes that are neither JPEG nor PNG, or a corrupt or truncated file, fail
 *   with an `InvalidImage` `PdfError`.
 * - JPEGs with 12-bit samples, or with a color space other than gray, RGB or
 *   CMYK, fail with an `Unsupported` `PdfError`.
 * - Color profiles, gamma and EXIF orientation are ignored.
 *
 * @see {@link image} for drawing the decoded image
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.0
 */
export const decodeImage = (bytes: Uint8Array): Effect.Effect<Image, PdfError> =>
  Effect.suspend(() => {
    try {
      if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return Effect.succeed(decodeJpeg(bytes))
      }
      if (bytes.length >= 8 && PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) {
        return Effect.succeed(decodePng(bytes))
      }
      return Effect.fail(invalidImage("the bytes are not a JPEG or PNG file"))
    } catch (error) {
      if (isPdfError(error)) return Effect.fail(error)
      throw error
    }
  })

const decodeJpeg = (bytes: Uint8Array): Image => {
  let adobe = false
  let i = 2
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) throw invalidImage("the JPEG file is corrupt")
    const marker = bytes[i + 1]
    // Fill bytes, and markers without a segment
    if (marker === 0xff) {
      i += 1
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2
      continue
    }
    // The image data starts or ends before a frame header
    if (marker === 0xd9 || marker === 0xda || i + 4 > bytes.length) break
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    if (length < 2 || i + 2 + length > bytes.length) break
    if (marker === 0xee && length >= 7 && ascii(bytes, i + 4, 5) === "Adobe") {
      adobe = true
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 8) break
      const precision = bytes[i + 4]
      const height = (bytes[i + 5] << 8) | bytes[i + 6]
      const width = (bytes[i + 7] << 8) | bytes[i + 8]
      const components = bytes[i + 9]
      if (precision !== 8) throw unsupported(`JPEG files with ${precision}-bit samples are not supported`)
      if (width === 0 || height === 0) {
        throw unsupported("JPEG files without dimensions in the frame header are not supported")
      }
      const colorSpace = components === 1
        ? "DeviceGray"
        : components === 3
        ? "DeviceRGB"
        : components === 4
        ? "DeviceCMYK"
        : undefined
      if (colorSpace === undefined) throw unsupported(`JPEG files with ${components} components are not supported`)
      return new ImageImpl("Jpeg", width, height, {
        _tag: "Jpeg",
        bytes,
        colorSpace,
        // Adobe applications write CMYK JPEGs with inverted samples
        invert: colorSpace === "DeviceCMYK" && adobe
      })
    }
    i += 2 + length
  }
  throw invalidImage("the JPEG file has no frame header")
}

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const PNG_BIT_DEPTHS: Record<number, ReadonlyArray<number> | undefined> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16]
}

const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

// Adam7 passes: x start, y start, x step, y step
const ADAM7: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2]
]

const NOT_INTERLACED: ReadonlyArray<readonly [number, number, number, number]> = [[0, 0, 1, 1]]

const decodePng = (bytes: Uint8Array): Image => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 8
  let header: {
    readonly width: number
    readonly height: number
    readonly bitDepth: number
    readonly colorType: number
    readonly interlaced: boolean
  } | undefined
  let palette: Uint8Array | undefined
  let transparency: Uint8Array | undefined
  const data: Array<Uint8Array> = []
  let ended = false
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = ascii(bytes, offset + 4, 4)
    const start = offset + 8
    if (start + length + 4 > bytes.length) throw invalidImage("the PNG file is truncated")
    const chunk = bytes.subarray(start, start + length)
    offset = start + length + 4
    if (header === undefined && type !== "IHDR") throw invalidImage("the PNG file does not start with an IHDR chunk")
    if (type === "IHDR") {
      if (length !== 13) throw invalidImage("the PNG IHDR chunk is malformed")
      header = {
        width: view.getUint32(start),
        height: view.getUint32(start + 4),
        bitDepth: chunk[8],
        colorType: chunk[9],
        interlaced: chunk[12] === 1
      }
      if (header.width === 0 || header.height === 0) throw invalidImage("the PNG image is empty")
      if (!PNG_BIT_DEPTHS[header.colorType]?.includes(header.bitDepth)) {
        throw invalidImage(`the PNG color type ${header.colorType} with bit depth ${header.bitDepth} is invalid`)
      }
      if (chunk[10] !== 0 || chunk[11] !== 0 || chunk[12] > 1) {
        throw invalidImage("the PNG file uses an unknown compression, filter or interlace method")
      }
    } else if (type === "PLTE") {
      palette = chunk
    } else if (type === "tRNS") {
      transparency = chunk
    } else if (type === "IDAT") {
      data.push(chunk)
    } else if (type === "IEND") {
      ended = true
      break
    }
  }
  if (header === undefined) throw invalidImage("the PNG file has no IHDR chunk")
  if (!ended) throw invalidImage("the PNG file is truncated")
  const { bitDepth, colorType, height, width } = header
  if (colorType === 3 && palette === undefined) throw invalidImage("the PNG file has no palette")
  if (width * height > 0x10000000) throw unsupported("PNG images with more than 268,435,456 pixels are not supported")
  const raw = inflateZlib(data)

  const channels = PNG_CHANNELS[colorType]
  const outChannels = colorType === 0 || colorType === 4 ? 1 : 3
  const color = new Uint8Array(width * height * outChannels)
  const hasAlpha = colorType === 4 || colorType === 6 || transparency !== undefined
  const alpha = hasAlpha ? new Uint8Array(width * height).fill(255) : undefined
  const maxSample = (1 << bitDepth) - 1
  const transparentSamples = transparency !== undefined && (colorType === 0 || colorType === 2)
    ? Array.from({ length: channels }, (_, i) => (transparency[i * 2] << 8) | transparency[i * 2 + 1])
    : undefined
  const bytesPerPixel = Math.max(1, (channels * bitDepth) >> 3)
  const samples = new Array<number>(channels)

  let position = 0
  for (const [xStart, yStart, xStep, yStep] of header.interlaced ? ADAM7 : NOT_INTERLACED) {
    const passWidth = width > xStart ? Math.ceil((width - xStart) / xStep) : 0
    const passHeight = height > yStart ? Math.ceil((height - yStart) / yStep) : 0
    if (passWidth === 0 || passHeight === 0) continue
    const rowLength = Math.ceil((passWidth * channels * bitDepth) / 8)
    if (position + passHeight * (rowLength + 1) > raw.length) throw invalidImage("the PNG image data is truncated")
    let previous = new Uint8Array(rowLength)
    for (let py = 0; py < passHeight; py++) {
      const filter = raw[position]
      const row = raw.subarray(position + 1, position + 1 + rowLength)
      position += rowLength + 1
      unfilter(filter, row, previous, bytesPerPixel)
      previous = row
      const y = yStart + py * yStep
      for (let px = 0; px < passWidth; px++) {
        for (let c = 0; c < channels; c++) {
          samples[c] = readSample(row, px * channels + c, bitDepth)
        }
        const pixel = y * width + xStart + px * xStep
        if (colorType === 3) {
          const index = samples[0]
          if (index * 3 + 2 >= palette!.length) throw invalidImage("a PNG palette index is out of range")
          color[pixel * 3] = palette![index * 3]
          color[pixel * 3 + 1] = palette![index * 3 + 1]
          color[pixel * 3 + 2] = palette![index * 3 + 2]
          if (alpha !== undefined && index < transparency!.length) alpha[pixel] = transparency![index]
          continue
        }
        for (let c = 0; c < outChannels; c++) {
          color[pixel * outChannels + c] = toByte(samples[c], bitDepth, maxSample)
        }
        if (colorType === 4 || colorType === 6) {
          alpha![pixel] = toByte(samples[channels - 1], bitDepth, maxSample)
        } else if (transparentSamples !== undefined && transparentSamples.every((s, i) => s === samples[i])) {
          alpha![pixel] = 0
        }
      }
    }
  }
  return new ImageImpl("Png", width, height, {
    _tag: "Pixels",
    colorSpace: outChannels === 1 ? "DeviceGray" : "DeviceRGB",
    color,
    // An opaque mask would only add bytes
    alpha: alpha !== undefined && alpha.some((a) => a !== 255) ? alpha : undefined
  })
}

const readSample = (row: Uint8Array, index: number, bitDepth: number): number => {
  switch (bitDepth) {
    case 8:
      return row[index]
    case 16:
      return (row[index * 2] << 8) | row[index * 2 + 1]
    default: {
      const bit = index * bitDepth
      return (row[bit >> 3] >> (8 - bitDepth - (bit & 7))) & ((1 << bitDepth) - 1)
    }
  }
}

const toByte = (sample: number, bitDepth: number, maxSample: number): number =>
  bitDepth === 8 ? sample : bitDepth === 16 ? sample >> 8 : Math.round((sample * 255) / maxSample)

const unfilter = (filter: number, row: Uint8Array, previous: Uint8Array, bpp: number): void => {
  switch (filter) {
    case 0:
      return
    case 1:
      for (let i = bpp; i < row.length; i++) row[i] = (row[i] + row[i - bpp]) & 0xff
      return
    case 2:
      for (let i = 0; i < row.length; i++) row[i] = (row[i] + previous[i]) & 0xff
      return
    case 3:
      for (let i = 0; i < row.length; i++) {
        const left = i >= bpp ? row[i - bpp] : 0
        row[i] = (row[i] + ((left + previous[i]) >> 1)) & 0xff
      }
      return
    case 4:
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp] : 0
        const b = previous[i]
        const c = i >= bpp ? previous[i - bpp] : 0
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        row[i] = (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      }
      return
    default:
      throw invalidImage(`the PNG filter type ${filter} is invalid`)
  }
}

const inflateZlib = (chunks: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  const queue = new ByteQueue()
  for (const chunk of chunks) queue.push(chunk)
  if (queue.length < 2) throw invalidImage("the PNG image data is truncated")
  const [cmf, flg] = queue.take(2)
  if ((cmf & 0x0f) !== 8 || ((cmf << 8) | flg) % 31 !== 0 || (flg & 0x20) !== 0) {
    throw invalidImage("the PNG image data is not a zlib stream")
  }
  const inflater = new Inflater(queue, new InflateMemory())
  const output: Array<Uint8Array> = []
  let length = 0
  try {
    while (true) {
      const out = inflater.pull()
      if (out === undefined) break
      if (out === NeedInput) throw invalidImage("the PNG image data is truncated")
      output.push(out)
      length += out.length
    }
  } catch (error) {
    if (error instanceof InflateError) throw invalidImage(`the PNG image data is corrupt: ${error.message}`)
    throw error
  }
  return concat(output, length)
}

const concat = (chunks: ReadonlyArray<Uint8Array>, length: number): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// -----------------------------------------------------------------------------
// Content
// -----------------------------------------------------------------------------

/**
 * How the ends of open lines are drawn: flat at the end point, rounded, or
 * squared off half the line width past it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export type LineCap = "Butt" | "Round" | "Square"

/**
 * How the corners of stroked paths are drawn.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export type LineJoin = "Miter" | "Round" | "Bevel"

/**
 * Stroke settings shared by lines and shapes.
 *
 * **Details**
 *
 * `lineWidth` defaults to 1 point. `dash` alternates the lengths of dashes and
 * gaps, such as `[3, 2]`; lines without `dash` are solid. `lineCap` defaults
 * to `"Butt"` and `lineJoin` to `"Miter"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface StrokeStyle {
  readonly lineWidth?: number | undefined
  readonly dash?: ReadonlyArray<number> | undefined
  readonly lineCap?: LineCap | undefined
  readonly lineJoin?: LineJoin | undefined
}

/**
 * Fill and stroke settings of shapes.
 *
 * **Details**
 *
 * A shape is filled when it has a `fill` color and outlined when it has a
 * `stroke` color.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface ShapeStyle extends StrokeStyle {
  readonly fill?: Color | undefined
  readonly stroke?: Color | undefined
}

/**
 * Text content: one or more lines drawn with a standard font.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Text {
  readonly _tag: "Text"
  readonly text: string
  readonly x: number
  readonly y: number
  readonly font: Font
  readonly size: number
  readonly color: Color
  readonly maxWidth: number | undefined
  readonly lineHeight: number
  readonly align: "Left" | "Center" | "Right"
  readonly underline: boolean
}

/**
 * Rectangle content, optionally with rounded corners.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Rect extends ShapeStyle {
  readonly _tag: "Rect"
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly radius: number
}

/**
 * Ellipse content, given by its center and radii.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Ellipse extends ShapeStyle {
  readonly _tag: "Ellipse"
  readonly x: number
  readonly y: number
  readonly radiusX: number
  readonly radiusY: number
}

/**
 * Straight line content between two points.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Line extends StrokeStyle {
  readonly _tag: "Line"
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly stroke: Color
}

/**
 * Path content: straight segments through a list of points, open or closed.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Path extends ShapeStyle {
  readonly _tag: "Path"
  readonly points: ReadonlyArray<readonly [x: number, y: number]>
  readonly closed: boolean
}

/**
 * Image content: a decoded image placed in a box on the page.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface ImageContent {
  readonly _tag: "Image"
  readonly image: Image
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Link content: an invisible clickable area that opens a URL.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Link {
  readonly _tag: "Link"
  readonly url: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Item drawn on a page.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export type Content = Text | Rect | Ellipse | Line | Path | ImageContent | Link

/**
 * Creates text content whose first line has its top-left corner at `x`, `y`.
 *
 * **Details**
 *
 * `font` defaults to `"Helvetica"`, `size` to 12 points and `color` to black.
 * Each line's baseline sits the font's ascent below the top of the line, and
 * lines are `lineHeight` times `size` apart (1.2 by default). Line breaks in
 * `text` start new lines. With `maxWidth`, lines are also wrapped at spaces,
 * and words wider than `maxWidth` are broken between characters. `align`
 * positions each line within `maxWidth`, or within the widest line when there
 * is no `maxWidth`.
 *
 * **Gotchas**
 *
 * Characters outside WinAnsiEncoding, including tabs and emoji, make
 * {@link encode} fail with an `Unsupported` `PdfError`.
 *
 * @see {@link measureText} for the size of the text before drawing it
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const text = (text: string, options: {
  readonly x: number
  readonly y: number
  readonly font?: Font | undefined
  readonly size?: number | undefined
  readonly color?: Color | undefined
  readonly maxWidth?: number | undefined
  readonly lineHeight?: number | undefined
  readonly align?: "Left" | "Center" | "Right" | undefined
  readonly underline?: boolean | undefined
}): Text => ({
  _tag: "Text",
  text,
  x: options.x,
  y: options.y,
  font: options.font ?? "Helvetica",
  size: options.size ?? 12,
  color: options.color ?? black,
  maxWidth: options.maxWidth,
  lineHeight: options.lineHeight ?? 1.2,
  align: options.align ?? "Left",
  underline: options.underline ?? false
})

/**
 * Creates rectangle content with its top-left corner at `x`, `y`.
 *
 * **Details**
 *
 * `radius` rounds the corners and is limited to half the shorter side. A
 * rectangle with neither `fill` nor `stroke` is filled with black.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const rect = (
  options: ShapeStyle & {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
    readonly radius?: number | undefined
  }
): Rect => ({ ...options, _tag: "Rect", radius: options.radius ?? 0 })

/**
 * Creates ellipse content centered at `x`, `y`.
 *
 * **Details**
 *
 * An ellipse with neither `fill` nor `stroke` is filled with black.
 *
 * @see {@link circle} for ellipses with equal radii
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const ellipse = (
  options: ShapeStyle & {
    readonly x: number
    readonly y: number
    readonly radiusX: number
    readonly radiusY: number
  }
): Ellipse => ({ ...options, _tag: "Ellipse" })

/**
 * Creates circle content centered at `x`, `y`.
 *
 * **Details**
 *
 * A circle with neither `fill` nor `stroke` is filled with black.
 *
 * @see {@link ellipse} for circles stretched along one axis
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const circle = (
  options: ShapeStyle & {
    readonly x: number
    readonly y: number
    readonly radius: number
  }
): Ellipse => {
  const { radius, ...rest } = options
  return { ...rest, _tag: "Ellipse", radiusX: radius, radiusY: radius }
}

/**
 * Creates a straight line from `x1`, `y1` to `x2`, `y2`, stroked in black
 * unless `stroke` sets another color.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const line = (
  options: StrokeStyle & {
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
    readonly stroke?: Color | undefined
  }
): Line => ({ ...options, _tag: "Line", stroke: options.stroke ?? black })

/**
 * Creates a path of straight segments through `points`.
 *
 * **Details**
 *
 * `closed` joins the last point to the first and defaults to `false`. A path
 * with neither `fill` nor `stroke` is stroked in black when it is open and
 * filled with black when it is closed.
 *
 * **Example** (Drawing a triangle)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * const triangle = Pdf.path({
 *   points: [[100, 200], [150, 100], [200, 200]],
 *   closed: true,
 *   fill: Pdf.rgb(1, 0.8, 0),
 *   stroke: Pdf.black
 * })
 * triangle.closed // => true
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const path = (
  options: ShapeStyle & {
    readonly points: ReadonlyArray<readonly [x: number, y: number]>
    readonly closed?: boolean | undefined
  }
): Path => ({ ...options, _tag: "Path", closed: options.closed ?? false })

/**
 * Creates image content with its top-left corner at `x`, `y`.
 *
 * **Details**
 *
 * Without `width` and `height`, each pixel takes one point. With only one of
 * them, the other follows the aspect ratio of the image. With both, the image
 * is stretched to fill the box.
 *
 * **Example** (Drawing a PNG at a fixed width)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Pdf } from "effect/encoding"
 *
 * declare const pngBytes: Uint8Array
 *
 * const program = Effect.gen(function*() {
 *   const logo = yield* Pdf.decodeImage(pngBytes)
 *   return yield* Pdf.encode(Pdf.document([
 *     Pdf.page([Pdf.image(logo, { x: 72, y: 72, width: 144 })])
 *   ]))
 * })
 * ```
 *
 * @see {@link decodeImage} for decoding JPEG and PNG files
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const image = (image: Image, options: {
  readonly x: number
  readonly y: number
  readonly width?: number | undefined
  readonly height?: number | undefined
}): ImageContent => {
  const width = options.width ?? (options.height === undefined
    ? image.width
    : options.height * image.width / image.height)
  const height = options.height ?? width * image.height / image.width
  return { _tag: "Image", image, x: options.x, y: options.y, width, height }
}

/**
 * Creates an invisible link area with its top-left corner at `x`, `y` that
 * opens `url` when clicked.
 *
 * **When to use**
 *
 * Use with {@link text} or a shape drawn over the same area, as the link
 * itself is not visible.
 *
 * **Gotchas**
 *
 * Characters outside printable ASCII, including spaces, are percent-encoded
 * as UTF-8.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const link = (url: string, options: {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}): Link => ({ _tag: "Link", url, x: options.x, y: options.y, width: options.width, height: options.height })

// -----------------------------------------------------------------------------
// Documents
// -----------------------------------------------------------------------------

/**
 * Page of a document: its size and the content drawn on it.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Page {
  readonly size: PageSize
  readonly content: ReadonlyArray<Content>
}

/**
 * Creates a page that draws `content` in order, so later items paint over
 * earlier ones. `size` defaults to {@link A4}.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const page = (content: ReadonlyArray<Content>, options?: {
  readonly size?: PageSize | undefined
}): Page => ({ size: options?.size ?? A4, content })

/**
 * Document properties shown by PDF readers.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Metadata {
  readonly title?: string | undefined
  readonly author?: string | undefined
  readonly subject?: string | undefined
  readonly keywords?: string | undefined
  readonly creator?: string | undefined
  readonly producer?: string | undefined
  readonly creationDate?: Date | undefined
  readonly modificationDate?: Date | undefined
}

/**
 * PDF document: pages and metadata.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface Document {
  readonly pages: ReadonlyArray<Page>
  readonly metadata: Metadata
}

/**
 * Creates a document from its pages and optional metadata.
 *
 * **Details**
 *
 * Metadata strings may contain any Unicode character. Dates are written in
 * UTC. A document has no metadata unless it is given, so encoding the same
 * document produces the same bytes on a given runtime.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.0
 */
export const document = (pages: ReadonlyArray<Page>, metadata?: Metadata): Document => ({
  pages,
  metadata: metadata ?? {}
})

// -----------------------------------------------------------------------------
// Text measurement
// -----------------------------------------------------------------------------

/**
 * Size and lines of laid-out text, in points.
 *
 * **Details**
 *
 * `width` is the width of the widest line. `height` spans from the top of the
 * first line to the font's descent below the last baseline. `lines` are the
 * lines drawn after splitting at line breaks and wrapping.
 *
 * @stability experimental
 * @category models
 * @since 4.1.0
 */
export interface TextMetrics {
  readonly width: number
  readonly height: number
  readonly lines: ReadonlyArray<string>
}

/**
 * Measures text as {@link text} lays it out, with the same font, size,
 * wrapping and line height options.
 *
 * **When to use**
 *
 * Use to place content below a block of text, to right-align text against a
 * point, or to check whether text fits in a box before drawing it.
 *
 * **Gotchas**
 *
 * Characters outside WinAnsiEncoding are measured as zero width, although
 * {@link encode} rejects them.
 *
 * **Example** (Measuring and wrapping text)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * Pdf.measureText("Hello", { size: 10 }).width // => 22.78
 * Pdf.measureText("one two three", { font: "Courier", size: 10, maxWidth: 50 }).lines // => ["one two", "three"]
 * ```
 *
 * @see {@link text} for drawing the measured text
 *
 * @stability experimental
 * @category utilities
 * @since 4.1.0
 */
export const measureText = (text: string, options?: {
  readonly font?: Font | undefined
  readonly size?: number | undefined
  readonly maxWidth?: number | undefined
  readonly lineHeight?: number | undefined
}): TextMetrics => {
  const font = options?.font ?? "Helvetica"
  const size = options?.size ?? 12
  const lineHeight = options?.lineHeight ?? 1.2
  const metrics = fontMetrics[font]
  const lines = layoutLines(metrics, text, size, options?.maxWidth)
  let width = 0
  for (const line of lines) width = Math.max(width, line.width)
  return {
    width,
    height: (lines.length - 1) * size * lineHeight + (metrics.ascent - metrics.descent) * size / 1000,
    lines: lines.map((line) => line.text)
  }
}

interface LaidOutLine {
  readonly text: string
  readonly width: number
}

const layoutLines = (
  metrics: FontMetrics,
  text: string,
  size: number,
  maxWidth: number | undefined
): Array<LaidOutLine> => {
  const out: Array<LaidOutLine> = []
  const measure = (line: string) => lineWidthOf(metrics, line, size)
  for (const paragraph of text.split(/\r\n|\r|\n/)) {
    if (maxWidth === undefined) {
      out.push({ text: paragraph, width: measure(paragraph) })
      continue
    }
    let current: string | undefined
    for (const word of paragraph.split(" ")) {
      const candidate = current === undefined ? word : current + " " + word
      if (measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      if (current !== undefined) out.push({ text: current, width: measure(current) })
      // Words wider than the line are broken between characters
      let piece = ""
      for (const char of word) {
        if (piece !== "" && measure(piece + char) > maxWidth) {
          out.push({ text: piece, width: measure(piece) })
          piece = ""
        }
        piece += char
      }
      current = piece
    }
    const last = current ?? ""
    out.push({ text: last, width: measure(last) })
  }
  return out
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

/**
 * Encodes a document as the bytes of a PDF 1.4 file.
 *
 * **Details**
 *
 * Content streams and PNG pixels are compressed with the runtime's
 * `CompressionStream("deflate")` unless `compress` is `false`. JPEG data is
 * always embedded as is. Fonts and images used on several pages are written
 * once.
 *
 * **Gotchas**
 *
 * - A document without pages, a non-positive page size, font size, line
 *   height or `maxWidth`, a negative width, height, radius or line width, a
 *   non-finite number, a color component outside 0 to 1, or an invalid date
 *   fails with an `InvalidValue` `PdfError`.
 * - Text with a character outside WinAnsiEncoding fails with an `Unsupported`
 *   `PdfError`.
 * - Compressed bytes come from the runtime's `CompressionStream`, so they can
 *   differ between runtimes. On a runtime without it, encoding dies unless
 *   `compress` is `false`.
 *
 * **Example** (Wrapping text and adding a link)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Pdf } from "effect/encoding"
 *
 * const paragraph = "Effect is a TypeScript library for building robust, type-safe applications."
 *
 * const doc = Pdf.document([
 *   Pdf.page([
 *     Pdf.text(paragraph, { x: 72, y: 72, maxWidth: 200, align: "Center" }),
 *     Pdf.link("https://effect.website", { x: 72, y: 72, width: 200, height: 60 })
 *   ], { size: Pdf.Letter })
 * ])
 *
 * const bytes = await Effect.runPromise(Pdf.encode(doc, { compress: false }))
 * new TextDecoder().decode(bytes).includes("/URI (https://effect.website)") // => true
 * ```
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.0
 */
export const encode = (document: Document, options?: {
  readonly compress?: boolean | undefined
}): Effect.Effect<Uint8Array<ArrayBuffer>, PdfError> =>
  Effect.suspend(() => {
    let built: Built
    try {
      built = build(document)
    } catch (error) {
      if (isPdfError(error)) return Effect.fail(error)
      throw error
    }
    if (options?.compress === false) return Effect.succeed(serialize(built))
    return Effect.map(
      Effect.forEach(built.objects, (object) =>
        object.stream !== undefined && object.filter === undefined
          ? Effect.map(deflate(object.stream), (stream): PdfObject => ({ ...object, stream, filter: "FlateDecode" }))
          : Effect.succeed(object)),
      (objects) => serialize({ objects, info: built.info })
    )
  })

interface PdfObject {
  // Dictionary entries without the brackets, and without /Length and /Filter
  readonly entries: string
  readonly stream?: Uint8Array | undefined
  readonly filter?: "FlateDecode" | "DCTDecode" | undefined
}

interface Built {
  readonly objects: ReadonlyArray<PdfObject>
  readonly info: number | undefined
}

const deflate = (bytes: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.promise(() =>
    new Response(
      new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new CompressionStream("deflate"))
    ).arrayBuffer().then((buffer) => new Uint8Array(buffer))
  )

const build = (document: Document): Built => {
  if (document.pages.length === 0) throw invalidValue("a document needs at least one page")
  const objects: Array<PdfObject> = []
  const allocate = (): number => objects.push({ entries: "" })
  const set = (ref: number, object: PdfObject) => {
    objects[ref - 1] = object
  }
  const catalogRef = allocate()
  const pagesRef = allocate()
  const resourcesRef = allocate()
  const fonts = new Map<Font, { readonly name: string; readonly ref: number }>()
  const images = new Map<ImageImpl, { readonly name: string; readonly ref: number }>()

  const fontResource = (font: Font): string => {
    let entry = fonts.get(font)
    if (entry === undefined) {
      entry = { name: `F${fonts.size + 1}`, ref: allocate() }
      fonts.set(font, entry)
      set(entry.ref, { entries: `/Type /Font /Subtype /Type1 /BaseFont /${font} /Encoding /WinAnsiEncoding` })
    }
    return entry.name
  }

  const imageResource = (image: Image): string => {
    if (!(image instanceof ImageImpl)) throw invalidValue("images must be created by decodeImage")
    let entry = images.get(image)
    if (entry === undefined) {
      entry = { name: `Im${images.size + 1}`, ref: allocate() }
      images.set(image, entry)
      const common = `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /BitsPerComponent 8`
      const data = image.data
      if (data._tag === "Jpeg") {
        const decode = data.invert ? " /Decode [1 0 1 0 1 0 1 0]" : ""
        set(entry.ref, {
          entries: `${common} /ColorSpace /${data.colorSpace}${decode}`,
          stream: data.bytes,
          filter: "DCTDecode"
        })
      } else {
        let mask = ""
        if (data.alpha !== undefined) {
          const maskRef = allocate()
          set(maskRef, { entries: `${common} /ColorSpace /DeviceGray`, stream: data.alpha })
          mask = ` /SMask ${maskRef} 0 R`
        }
        set(entry.ref, { entries: `${common} /ColorSpace /${data.colorSpace}${mask}`, stream: data.color })
      }
    }
    return entry.name
  }

  const pageRefs: Array<number> = []
  for (const page of document.pages) {
    const width = positive(page.size.width, "page width")
    const height = positive(page.size.height, "page height")
    const ops: Array<string> = []
    const annotations: Array<number> = []
    for (const content of page.content) {
      writeContent(content, height, ops, fontResource, imageResource, (entries) => {
        annotations.push(objects.push({ entries }))
      })
    }
    const contentRef = objects.push({ entries: "", stream: latin1(ops.join("\n")) })
    const annots = annotations.length > 0 ? ` /Annots [${references(annotations)}]` : ""
    pageRefs.push(objects.push({
      entries: `/Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${num(width)} ${
        num(height)
      }] /Resources ${resourcesRef} 0 R /Contents ${contentRef} 0 R${annots}`
    }))
  }

  set(catalogRef, { entries: `/Type /Catalog /Pages ${pagesRef} 0 R` })
  set(pagesRef, { entries: `/Type /Pages /Kids [${references(pageRefs)}] /Count ${pageRefs.length}` })
  const resources: Array<string> = []
  if (fonts.size > 0) {
    resources.push(`/Font << ${Array.from(fonts.values(), ({ name, ref }) => `/${name} ${ref} 0 R`).join(" ")} >>`)
  }
  if (images.size > 0) {
    resources.push(`/XObject << ${Array.from(images.values(), ({ name, ref }) => `/${name} ${ref} 0 R`).join(" ")} >>`)
  }
  set(resourcesRef, { entries: resources.join(" ") })

  const info = infoEntries(document.metadata)
  return { objects, info: info === "" ? undefined : objects.push({ entries: info }) }
}

const references = (refs: ReadonlyArray<number>): string => refs.map((ref) => `${ref} 0 R`).join(" ")

const writeContent = (
  content: Content,
  pageHeight: number,
  ops: Array<string>,
  fontResource: (font: Font) => string,
  imageResource: (image: Image) => string,
  annotate: (entries: string) => void
): void => {
  switch (content._tag) {
    case "Text": {
      if (!isFont(content.font)) throw invalidValue(`unknown font ${JSON.stringify(content.font)}`)
      const metrics = fontMetrics[content.font]
      const size = positive(content.size, "font size")
      const lineHeight = positive(content.lineHeight, "line height")
      const maxWidth = content.maxWidth === undefined ? undefined : positive(content.maxWidth, "maxWidth")
      const x = finite(content.x, "x")
      const y = finite(content.y, "y")
      const lines = layoutLines(metrics, content.text, size, maxWidth)
      let boxWidth = maxWidth ?? 0
      if (maxWidth === undefined) { for (const line of lines) boxWidth = Math.max(boxWidth, line.width) }
      const out = ["q", colorOp(content.color, false), `BT /${fontResource(content.font)} ${num(size)} Tf`]
      const underlines: Array<string> = []
      lines.forEach((line, i) => {
        const dx = content.align === "Center"
          ? (boxWidth - line.width) / 2
          : content.align === "Right"
          ? boxWidth - line.width
          : 0
        const baseline = pageHeight - (y + metrics.ascent * size / 1000 + i * size * lineHeight)
        out.push(`1 0 0 1 ${num(x + dx)} ${num(baseline)} Tm ${literal(encodeText(line.text))} Tj`)
        if (content.underline && line.width > 0) {
          // The standard fonts all draw a 50-unit underline 100 units below the baseline
          underlines.push(`${num(x + dx)} ${num(baseline - size * 0.125)} ${num(line.width)} ${num(size * 0.05)} re`)
        }
      })
      out.push("ET")
      if (underlines.length > 0) out.push(...underlines, "f")
      out.push("Q")
      ops.push(out.join("\n"))
      return
    }
    case "Rect": {
      const x = finite(content.x, "x")
      const width = nonNegative(content.width, "width")
      const height = nonNegative(content.height, "height")
      const bottom = pageHeight - finite(content.y, "y") - height
      const radius = Math.min(nonNegative(content.radius, "radius"), width / 2, height / 2)
      if (radius === 0) {
        ops.push(paintShape(content, `${num(x)} ${num(bottom)} ${num(width)} ${num(height)} re`, true))
        return
      }
      const right = x + width
      const top = bottom + height
      // Distance from a corner to the control points of its arc
      const k = radius * (1 - KAPPA)
      ops.push(paintShape(
        content,
        [
          `${num(x + radius)} ${num(bottom)} m`,
          `${num(right - radius)} ${num(bottom)} l`,
          curve(right - k, bottom, right, bottom + k, right, bottom + radius),
          `${num(right)} ${num(top - radius)} l`,
          curve(right, top - k, right - k, top, right - radius, top),
          `${num(x + radius)} ${num(top)} l`,
          curve(x + k, top, x, top - k, x, top - radius),
          `${num(x)} ${num(bottom + radius)} l`,
          curve(x, bottom + k, x + k, bottom, x + radius, bottom),
          "h"
        ].join("\n"),
        true
      ))
      return
    }
    case "Ellipse": {
      const cx = finite(content.x, "x")
      const cy = pageHeight - finite(content.y, "y")
      const rx = nonNegative(content.radiusX, "radiusX")
      const ry = nonNegative(content.radiusY, "radiusY")
      const ox = rx * KAPPA
      const oy = ry * KAPPA
      ops.push(paintShape(
        content,
        [
          `${num(cx + rx)} ${num(cy)} m`,
          curve(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry),
          curve(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy),
          curve(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry),
          curve(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy),
          "h"
        ].join("\n"),
        true
      ))
      return
    }
    case "Line": {
      const start = point(content.x1, content.y1, pageHeight)
      const end = point(content.x2, content.y2, pageHeight)
      ops.push(paintShape({ ...content, fill: undefined }, `${start} m\n${end} l`, false))
      return
    }
    case "Path": {
      if (content.points.length === 0) return
      const segments = content.points.map(([x, y], i) => `${point(x, y, pageHeight)} ${i === 0 ? "m" : "l"}`)
      if (content.closed) segments.push("h")
      ops.push(paintShape(content, segments.join("\n"), content.closed))
      return
    }
    case "Image": {
      const name = imageResource(content.image)
      const width = nonNegative(content.width, "width")
      const height = nonNegative(content.height, "height")
      const x = finite(content.x, "x")
      const bottom = pageHeight - finite(content.y, "y") - height
      ops.push(`q\n${num(width)} 0 0 ${num(height)} ${num(x)} ${num(bottom)} cm\n/${name} Do\nQ`)
      return
    }
    case "Link": {
      const x = finite(content.x, "x")
      const top = pageHeight - finite(content.y, "y")
      const width = nonNegative(content.width, "width")
      const height = nonNegative(content.height, "height")
      const rect = `[${num(x)} ${num(top - height)} ${num(x + width)} ${num(top)}]`
      const uri = literal(latin1(uriString(content.url)))
      annotate(`/Type /Annot /Subtype /Link /Rect ${rect} /Border [0 0 0] /A << /S /URI /URI ${uri} >>`)
      return
    }
  }
}

// Distance of the Bézier control points of a quarter circle of radius 1 from its ends
const KAPPA = 0.5522847498

const point = (x: number, y: number, pageHeight: number): string =>
  `${num(finite(x, "x"))} ${num(pageHeight - finite(y, "y"))}`

const curve = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): string =>
  `${num(x1)} ${num(y1)} ${num(x2)} ${num(y2)} ${num(x3)} ${num(y3)} c`

const paintShape = (style: ShapeStyle, shape: string, closed: boolean): string => {
  const fill = style.fill ?? (style.stroke === undefined && closed ? black : undefined)
  const stroke = style.stroke ?? (fill === undefined ? black : undefined)
  const out = ["q"]
  if (fill !== undefined) out.push(colorOp(fill, false))
  if (stroke !== undefined) {
    out.push(colorOp(stroke, true))
    if (style.lineWidth !== undefined) out.push(`${num(nonNegative(style.lineWidth, "lineWidth"))} w`)
    if (style.dash !== undefined && style.dash.length > 0) {
      const dash = style.dash.map((length) => nonNegative(length, "dash length"))
      if (dash.every((length) => length === 0)) throw invalidValue("dash lengths cannot all be zero")
      out.push(`[${dash.map(num).join(" ")}] 0 d`)
    }
    if (style.lineCap !== undefined) out.push(`${lineStyle(lineCaps, "lineCap", style.lineCap)} J`)
    if (style.lineJoin !== undefined) out.push(`${lineStyle(lineJoins, "lineJoin", style.lineJoin)} j`)
  }
  out.push(shape, fill !== undefined && stroke !== undefined ? "B" : fill !== undefined ? "f" : "S", "Q")
  return out.join("\n")
}

const lineCaps: Record<string, number> = { Butt: 0, Round: 1, Square: 2 }
const lineJoins: Record<string, number> = { Miter: 0, Round: 1, Bevel: 2 }

const lineStyle = (values: Record<string, number>, name: string, value: string): number => {
  if (!Object.hasOwn(values, value)) throw invalidValue(`invalid ${name} ${JSON.stringify(value)}`)
  return values[value]
}

const colorOp = (color: Color, stroke: boolean): string => {
  switch (color._tag) {
    case "Gray":
      return `${component(color.gray)} ${stroke ? "G" : "g"}`
    case "Rgb":
      return `${component(color.red)} ${component(color.green)} ${component(color.blue)} ${stroke ? "RG" : "rg"}`
    case "Cmyk":
      return [color.cyan, color.magenta, color.yellow, color.black].map(component).join(" ") +
        (stroke ? " K" : " k")
    default:
      throw invalidValue("invalid color")
  }
}

const component = (value: number): string => {
  if (!(value >= 0 && value <= 1)) throw invalidValue(`color component ${value} is not between 0 and 1`)
  return num(value)
}

const finite = (value: number, name: string): number => {
  if (!Number.isFinite(value)) throw invalidValue(`${name} must be a finite number, got ${value}`)
  return value
}

const nonNegative = (value: number, name: string): number => {
  if (!(Number.isFinite(value) && value >= 0)) throw invalidValue(`${name} must be a non-negative number, got ${value}`)
  return value
}

const positive = (value: number, name: string): number => {
  if (!(Number.isFinite(value) && value > 0)) throw invalidValue(`${name} must be a positive number, got ${value}`)
  return value
}

// Formats a number as a PDF real with at most four decimals
const num = (value: number): string => {
  if (!(Math.abs(value) < 1e9)) throw invalidValue(`the number ${value} is out of range`)
  const rounded = Math.round(value * 10000) / 10000
  return rounded === 0 ? "0" : String(rounded)
}

const encodeText = (text: string): Uint8Array => {
  const out = new Uint8Array(text.length)
  let length = 0
  for (const char of text) {
    const codePoint = char.codePointAt(0)!
    const code = winAnsiCode(codePoint)
    if (code < 0) {
      const hex = codePoint.toString(16).toUpperCase().padStart(4, "0")
      throw unsupported(`the character ${JSON.stringify(char)} (U+${hex}) cannot be drawn with the standard fonts`)
    }
    out[length++] = code
  }
  return out.subarray(0, length)
}

// Writes bytes as a literal string, escaping delimiters and non-printable bytes
const literal = (bytes: Uint8Array): string => {
  let out = "("
  for (const byte of bytes) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += "\\" + String.fromCharCode(byte)
    else if (byte >= 0x20 && byte <= 0x7e) out += String.fromCharCode(byte)
    else out += "\\" + byte.toString(8).padStart(3, "0")
  }
  return out + ")"
}

const uriString = (url: string): string => {
  try {
    return url.replace(/[^\x21-\x7e]+/g, encodeURIComponent)
  } catch {
    throw invalidValue(`the URL ${JSON.stringify(url)} is not well-formed Unicode`)
  }
}

// Writes a text string: a literal string when it is printable ASCII, and
// UTF-16BE with a byte order mark otherwise
const textString = (value: string): string => {
  if (/^[\x20-\x7e]*$/.test(value)) return literal(latin1(value))
  let out = "<FEFF"
  for (let i = 0; i < value.length; i++) out += value.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")
  return out + ">"
}

const dateString = (date: Date, name: string): string => {
  if (Number.isNaN(date.getTime())) throw invalidValue(`${name} is an invalid date`)
  const year = date.getUTCFullYear()
  if (year < 0 || year > 9999) throw invalidValue(`${name} is outside the years 0 to 9999`)
  const pad = (n: number) => String(n).padStart(2, "0")
  const day = `${String(year).padStart(4, "0")}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  return `(D:${day}${time}Z)`
}

const infoEntries = (metadata: Metadata): string => {
  const entries: Array<string> = []
  const add = (key: string, value: string | undefined) => {
    if (value !== undefined) entries.push(`/${key} ${textString(value)}`)
  }
  add("Title", metadata.title)
  add("Author", metadata.author)
  add("Subject", metadata.subject)
  add("Keywords", metadata.keywords)
  add("Creator", metadata.creator)
  add("Producer", metadata.producer)
  if (metadata.creationDate !== undefined) {
    entries.push(`/CreationDate ${dateString(metadata.creationDate, "creationDate")}`)
  }
  if (metadata.modificationDate !== undefined) {
    entries.push(`/ModDate ${dateString(metadata.modificationDate, "modificationDate")}`)
  }
  return entries.join(" ")
}

// Converts a string of characters below U+0100 to bytes
const latin1 = (value: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i)
  return out
}

const serialize = ({ info, objects }: Built): Uint8Array<ArrayBuffer> => {
  const chunks: Array<Uint8Array> = []
  let length = 0
  const write = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? latin1(chunk) : chunk
    chunks.push(bytes)
    length += bytes.length
  }
  // A comment of bytes above 127 marks the file as binary
  write("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
  const offsets: Array<number> = []
  objects.forEach((object, i) => {
    offsets.push(length)
    if (object.stream === undefined) {
      write(`${i + 1} 0 obj\n<< ${object.entries} >>\nendobj\n`)
      return
    }
    const entries = [object.entries, `/Length ${object.stream.length}`]
    if (object.filter !== undefined) entries.push(`/Filter /${object.filter}`)
    write(`${i + 1} 0 obj\n<< ${entries.filter((entry) => entry !== "").join(" ")} >>\nstream\n`)
    write(object.stream)
    write("\nendstream\nendobj\n")
  })
  const xref = length
  const size = objects.length + 1
  write(`xref\n0 ${size}\n0000000000 65535 f \n`)
  for (const offset of offsets) write(`${String(offset).padStart(10, "0")} 00000 n \n`)
  const infoEntry = info === undefined ? "" : ` /Info ${info} 0 R`
  write(`trailer\n<< /Size ${size} /Root 1 0 R${infoEntry} >>\nstartxref\n${xref}\n%%EOF\n`)
  return concat(chunks, length)
}
