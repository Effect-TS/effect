/**
 * Builds PDF documents from pages of text, vector shapes, images and links.
 *
 * A document is plain data: pages hold a list of content built with `text`,
 * `rect`, `line`, `ellipse`, `path`, `image` and `link`, and `encode` writes
 * the whole document as PDF 1.7 bytes. Coordinates are in points (1/72 inch)
 * with the origin at the top-left corner of the page and `y` growing
 * downwards.
 *
 * Text uses the twelve Latin standard fonts that every PDF reader provides
 * (Helvetica, Times and Courier with their bold and italic faces), so no font
 * data is embedded. `measureText` wraps and measures text with the same
 * metrics `encode` uses, for laying out content. Images are JPEG or PNG,
 * including PNG transparency.
 *
 * Streams are compressed with the runtime's `CompressionStream("deflate")`,
 * and PNG images with transparency or interlacing are decoded with
 * `DecompressionStream("deflate")`. Embedded fonts, encryption, forms and
 * reading existing PDF files are not supported.
 *
 * This module is experimental and may receive breaking changes in patch
 * releases.
 *
 * @stability experimental
 * @since 4.1.2
 */
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import { type FontMetrics, fontMetrics } from "../internal/pdfFontMetrics.ts"
import * as Predicate from "../Predicate.ts"

const PdfErrorTypeId = "~effect/encoding/Pdf/PdfError"

/**
 * Error raised when an image cannot be read or a document cannot be encoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `InvalidImage`: image bytes are not a JPEG or PNG image this module
 *   reads, or their compressed data is corrupt.
 * - `UnsupportedCharacter`: text contains a character the standard fonts
 *   cannot show.
 * - `InvalidValue`: a number is not finite, a size is not positive, a color
 *   component or opacity is outside `0` to `1`, or a font or image was not
 *   created by this module.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.2
 */
export class PdfError extends Data.TaggedError("PdfError")<{
  readonly kind: "InvalidImage" | "UnsupportedCharacter" | "InvalidValue"
  readonly message: string
}> {
  /**
   * Marks this value as a PDF error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.2
   */
  readonly [PdfErrorTypeId] = PdfErrorTypeId
}

/**
 * Checks whether a value is a `PdfError`.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.2
 */
export const isPdfError = (u: unknown): u is PdfError => Predicate.hasProperty(u, PdfErrorTypeId)

/**
 * Name of a standard PDF font.
 *
 * **Details**
 *
 * PDF readers provide these fonts, so documents that use them embed no font
 * data. They show the characters of the Windows-1252 code page: ASCII, Latin-1
 * and a few typographic characters such as curly quotes, dashes, `€` and `…`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
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

/**
 * Color used to fill or stroke content.
 *
 * **Details**
 *
 * Components range from `0` to `1`. Build colors with `gray`, `rgb` or `cmyk`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
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
 * Creates a gray color from a level between `0` (black) and `1` (white).
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const gray = (gray: number): Color => ({ _tag: "Gray", gray })

/**
 * Creates an RGB color from components between `0` and `1`.
 *
 * **Example** (Using 8-bit components)
 *
 * ```ts
 * import { Pdf } from "effect/encoding"
 *
 * const teal = Pdf.rgb(0 / 255, 128 / 255, 128 / 255)
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const rgb = (red: number, green: number, blue: number): Color => ({ _tag: "Rgb", red, green, blue })

/**
 * Creates a CMYK color from components between `0` and `1`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const cmyk = (cyan: number, magenta: number, yellow: number, black: number): Color => ({
  _tag: "Cmyk",
  cyan,
  magenta,
  yellow,
  black
})

/**
 * Width and height of a page, in points.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Size {
  readonly width: number
  readonly height: number
}

/**
 * ISO A3 page size, 297 × 420 mm.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const A3: Size = { width: 841.89, height: 1190.55 }

/**
 * ISO A4 page size, 210 × 297 mm.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const A4: Size = { width: 595.28, height: 841.89 }

/**
 * ISO A5 page size, 148 × 210 mm.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const A5: Size = { width: 419.53, height: 595.28 }

/**
 * US Letter page size, 8.5 × 11 inches.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const Letter: Size = { width: 612, height: 792 }

/**
 * US Legal page size, 8.5 × 14 inches.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const Legal: Size = { width: 612, height: 1008 }

/**
 * Returns a page size with its longer side horizontal.
 *
 * @stability experimental
 * @category combinators
 * @since 4.1.2
 */
export const landscape = (size: Size): Size =>
  size.width >= size.height ? size : { width: size.height, height: size.width }

/**
 * Fill and stroke style of a shape.
 *
 * **Details**
 *
 * A shape with neither `fill` nor `stroke` is stroked in black. `lineWidth`
 * defaults to `1`, `dash` lists alternating dash and gap lengths, and
 * `fillRule` decides which areas of a self-intersecting path are filled.
 * `opacity` applies to both the fill and the stroke.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Style {
  readonly fill?: Color | undefined
  readonly stroke?: Color | undefined
  readonly lineWidth?: number | undefined
  readonly lineCap?: "butt" | "round" | "square" | undefined
  readonly lineJoin?: "miter" | "round" | "bevel" | undefined
  readonly dash?: ReadonlyArray<number> | undefined
  readonly fillRule?: "nonzero" | "evenodd" | undefined
  readonly opacity?: number | undefined
}

/**
 * Step of a path outline.
 *
 * **Details**
 *
 * `CurveTo` draws a cubic Bézier curve from the current point to `x`, `y`
 * through the control points `x1`, `y1` and `x2`, `y2`. `Close` draws a line
 * back to the start of the current subpath.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export type Segment =
  | { readonly _tag: "MoveTo"; readonly x: number; readonly y: number }
  | { readonly _tag: "LineTo"; readonly x: number; readonly y: number }
  | {
    readonly _tag: "CurveTo"
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
    readonly x: number
    readonly y: number
  }
  | { readonly _tag: "Close" }

/**
 * Creates a path segment that starts a new subpath at a point.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const moveTo = (x: number, y: number): Segment => ({ _tag: "MoveTo", x, y })

/**
 * Creates a path segment that draws a straight line to a point.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const lineTo = (x: number, y: number): Segment => ({ _tag: "LineTo", x, y })

/**
 * Creates a path segment that draws a cubic Bézier curve to a point.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const curveTo = (x1: number, y1: number, x2: number, y2: number, x: number, y: number): Segment => ({
  _tag: "CurveTo",
  x1,
  y1,
  x2,
  y2,
  x,
  y
})

/**
 * Path segment that closes the current subpath.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.2
 */
export const close: Segment = { _tag: "Close" }

/**
 * Image that can be drawn on pages, read by `jpeg` or `png`.
 *
 * **Details**
 *
 * `width` and `height` are in pixels. An image drawn on several pages is
 * written to the document once.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Image {
  readonly format: "jpeg" | "png"
  readonly width: number
  readonly height: number
}

/**
 * Text drawn on a page, built by `text`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface TextContent {
  readonly _tag: "Text"
  readonly text: string
  readonly x: number
  readonly y: number
  readonly font: Font
  readonly size: number
  readonly color: Color
  readonly width: number | undefined
  readonly align: "left" | "center" | "right" | "justify"
  readonly lineHeight: number
  readonly opacity: number | undefined
}

/**
 * Shape drawn on a page, built by `path`, `rect`, `line` or `ellipse`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface PathContent {
  readonly _tag: "Path"
  readonly segments: ReadonlyArray<Segment>
  readonly style: Style
}

/**
 * Image drawn on a page, built by `image`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface ImageContent {
  readonly _tag: "Image"
  readonly image: Image
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly opacity: number | undefined
}

/**
 * Clickable area of a page that opens a URL, built by `link`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface LinkContent {
  readonly _tag: "Link"
  readonly url: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Content of a page. Later content is drawn over earlier content.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export type Content = TextContent | PathContent | ImageContent | LinkContent

/**
 * Page of a document, built by `page`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Page {
  readonly size: Size
  readonly content: ReadonlyArray<Content>
}

/**
 * Metadata of a document, shown by PDF readers in the document properties.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Info {
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
 * PDF document, built by `document`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Document {
  readonly pages: ReadonlyArray<Page>
  readonly info: Info
}

/**
 * Creates a document from its pages and optional metadata.
 *
 * **Details**
 *
 * The document has no creation date unless one is given, so encoding the same
 * document always produces the same bytes.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const document = (pages: ReadonlyArray<Page>, info?: Info): Document => ({ pages, info: info ?? {} })

/**
 * Creates a page from its content. Pages are A4 unless a `size` is given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const page = (content: ReadonlyArray<Content>, options?: {
  readonly size?: Size | undefined
}): Page => ({ size: options?.size ?? A4, content })

/**
 * Creates text whose first line box starts at `x`, `y`.
 *
 * **Details**
 *
 * Text is set in 12 pt Helvetica in black unless configured otherwise. Each
 * line takes `lineHeight` times `size` vertically, with the glyphs centered in
 * it, so a block of `n` lines is `n * lineHeight * size` tall. Line breaks in
 * the text start new lines. With a `width`, longer lines are wrapped at spaces,
 * words wider than `width` are split, and `align` places each line within the
 * width; `"justify"` stretches every wrapped line except the last line of each
 * paragraph.
 *
 * **Gotchas**
 *
 * - Characters outside the Windows-1252 code page, such as emoji or most
 *   non-Latin scripts, make `encode` fail with an `UnsupportedCharacter`
 *   error.
 * - Without a `width`, `"center"` and `"right"` align lines with each other
 *   rather than with a box.
 *
 * **Example** (Drawing a wrapped paragraph)
 *
 * ```ts
 * import { Pdf } from "effect/encoding"
 *
 * const paragraph = Pdf.text("The quick brown fox jumps over the lazy dog.", {
 *   x: 72,
 *   y: 72,
 *   width: 120,
 *   font: "Times-Roman",
 *   align: "justify"
 * })
 * ```
 *
 * @see {@link measureText} for the lines and size of the text
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const text = (text: string, options: {
  readonly x: number
  readonly y: number
  readonly font?: Font | undefined
  readonly size?: number | undefined
  readonly color?: Color | undefined
  readonly width?: number | undefined
  readonly align?: "left" | "center" | "right" | "justify" | undefined
  readonly lineHeight?: number | undefined
  readonly opacity?: number | undefined
}): TextContent => ({
  _tag: "Text",
  text,
  x: options.x,
  y: options.y,
  font: options.font ?? "Helvetica",
  size: options.size ?? 12,
  color: options.color ?? black,
  width: options.width,
  align: options.align ?? "left",
  lineHeight: options.lineHeight ?? 1.2,
  opacity: options.opacity
})

/**
 * Creates a shape from path segments.
 *
 * **Example** (Drawing a triangle)
 *
 * ```ts
 * import { Pdf } from "effect/encoding"
 *
 * const triangle = Pdf.path(
 *   [Pdf.moveTo(100, 200), Pdf.lineTo(150, 100), Pdf.lineTo(200, 200), Pdf.close],
 *   { fill: Pdf.rgb(1, 0.8, 0), stroke: Pdf.gray(0) }
 * )
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const path = (segments: ReadonlyArray<Segment>, style?: Style): PathContent => ({
  _tag: "Path",
  segments,
  style: style ?? {}
})

/**
 * Creates a rectangle whose top-left corner is at `x`, `y`, with corners
 * rounded by `radius` when it is given.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const rect = (
  options: Style & {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
    readonly radius?: number | undefined
  }
): PathContent => {
  const { height, width, x, y } = options
  const radius = Math.max(0, Math.min(options.radius ?? 0, Math.abs(width) / 2, Math.abs(height) / 2))
  if (radius === 0) {
    return path(
      [moveTo(x, y), lineTo(x + width, y), lineTo(x + width, y + height), lineTo(x, y + height), close],
      options
    )
  }
  const rx = Math.sign(width) * radius
  const ry = Math.sign(height) * radius
  const cx = rx * (1 - KAPPA)
  const cy = ry * (1 - KAPPA)
  const right = x + width
  const bottom = y + height
  return path([
    moveTo(x + rx, y),
    lineTo(right - rx, y),
    curveTo(right - cx, y, right, y + cy, right, y + ry),
    lineTo(right, bottom - ry),
    curveTo(right, bottom - cy, right - cx, bottom, right - rx, bottom),
    lineTo(x + rx, bottom),
    curveTo(x + cx, bottom, x, bottom - cy, x, bottom - ry),
    lineTo(x, y + ry),
    curveTo(x, y + cy, x + cx, y, x + rx, y),
    close
  ], options)
}

/**
 * Creates a straight line between two points.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const line = (
  options: Style & {
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
  }
): PathContent => path([moveTo(options.x1, options.y1), lineTo(options.x2, options.y2)], options)

/**
 * Creates an ellipse centered at `x`, `y`. Pass the same radius twice for a
 * circle.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const ellipse = (
  options: Style & {
    readonly x: number
    readonly y: number
    readonly radiusX: number
    readonly radiusY: number
  }
): PathContent => {
  const { radiusX: rx, radiusY: ry, x, y } = options
  const kx = rx * KAPPA
  const ky = ry * KAPPA
  return path([
    moveTo(x + rx, y),
    curveTo(x + rx, y + ky, x + kx, y + ry, x, y + ry),
    curveTo(x - kx, y + ry, x - rx, y + ky, x - rx, y),
    curveTo(x - rx, y - ky, x - kx, y - ry, x, y - ry),
    curveTo(x + kx, y - ry, x + rx, y - ky, x + rx, y),
    close
  ], options)
}

/**
 * Creates an image drawn with its top-left corner at `x`, `y`.
 *
 * **Details**
 *
 * Without `width` and `height` the image is drawn at one point per pixel.
 * With only one of them, the other keeps the aspect ratio of the image.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const image = (image: Image, options: {
  readonly x: number
  readonly y: number
  readonly width?: number | undefined
  readonly height?: number | undefined
  readonly opacity?: number | undefined
}): ImageContent => {
  const width = options.width ?? (options.height === undefined
    ? image.width
    : options.height * image.width / image.height)
  const height = options.height ?? width * image.height / image.width
  return { _tag: "Image", image, x: options.x, y: options.y, width, height, opacity: options.opacity }
}

/**
 * Creates a clickable area that opens a URL, with its top-left corner at `x`,
 * `y`.
 *
 * **Details**
 *
 * The area is invisible; draw text or shapes under it to show the link.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const link = (options: {
  readonly url: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}): LinkContent => ({
  _tag: "Link",
  url: options.url,
  x: options.x,
  y: options.y,
  width: options.width,
  height: options.height
})

/**
 * Lays out text as `text` would and returns its lines, the width of the
 * widest line and the height of the block, in points.
 *
 * **When to use**
 *
 * Use to place content after a block of text, or to decide whether text fits
 * on a page before drawing it.
 *
 * **Gotchas**
 *
 * Characters that `encode` rejects are measured as zero width.
 *
 * **Example** (Placing content below a paragraph)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * const options = { font: "Helvetica", size: 10, width: 70 } as const
 * const measured = Pdf.measureText("Wrapped onto several lines", options)
 *
 * measured.lines // => ["Wrapped onto", "several lines"]
 * measured.height // => 24
 *
 * const caption = Pdf.text("Caption", { x: 72, y: 72 + measured.height + 6, size: 8 })
 * ```
 *
 * @see {@link text} for drawing the text
 *
 * @stability experimental
 * @category utilities
 * @since 4.1.2
 */
export const measureText = (text: string, options?: {
  readonly font?: Font | undefined
  readonly size?: number | undefined
  readonly width?: number | undefined
  readonly lineHeight?: number | undefined
}): {
  readonly lines: ReadonlyArray<string>
  readonly width: number
  readonly height: number
} => {
  const metrics = fontMetrics[options?.font ?? "Helvetica"] ?? fontMetrics.Helvetica
  const size = options?.size ?? 12
  const lines = layout(text, metrics, size, options?.width).map((line) => line.text)
  let width = 0
  for (const line of lines) width = Math.max(width, lineWidth(line, metrics, size))
  return { lines, width, height: lines.length * (options?.lineHeight ?? 1.2) * size }
}

/**
 * Reads a JPEG image.
 *
 * **Details**
 *
 * The image data is embedded as it is, so it is not decoded or recompressed.
 * Grayscale, RGB and CMYK images with baseline, extended or progressive
 * Huffman coding are supported.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const jpeg = (bytes: Uint8Array): Effect.Effect<Image, PdfError> => Effect.suspend(() => readJpeg(bytes))

/**
 * Reads a PNG image.
 *
 * **Details**
 *
 * Every PNG color type and bit depth is supported, including transparency
 * from an alpha channel or a `tRNS` chunk and interlaced images. Images without
 * an alpha channel, palette transparency or interlacing are embedded without
 * being decoded.
 *
 * **Gotchas**
 *
 * Only the header is checked here; corrupt image data makes `encode` fail with
 * an `InvalidImage` error.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const png = (bytes: Uint8Array): Effect.Effect<Image, PdfError> => Effect.suspend(() => readPng(bytes))

/**
 * Encodes a document as the bytes of a PDF file.
 *
 * **Details**
 *
 * Fonts and images are written once however often they are used. Page content
 * and decoded images are compressed unless `compress` is `false`, which keeps
 * page content readable for debugging.
 *
 * **Gotchas**
 *
 * - Compression needs `CompressionStream("deflate")`, and PNG images that are
 *   decoded need `DecompressionStream("deflate")`.
 * - Every value is checked while encoding, so invalid values, such as a color
 *   component outside `0` to `1`, fail here rather than in the constructors.
 *
 * **Example** (Writing a one-page document)
 *
 * ```ts
 * import { Effect } from "effect"
 * import { Pdf } from "effect/encoding"
 *
 * const program = Effect.gen(function*() {
 *   const doc = Pdf.document([
 *     Pdf.page([
 *       Pdf.rect({ x: 0, y: 0, width: Pdf.A4.width, height: 96, fill: Pdf.rgb(0.1, 0.2, 0.4) }),
 *       Pdf.text("Invoice", { x: 48, y: 36, size: 24, font: "Helvetica-Bold", color: Pdf.gray(1) }),
 *       Pdf.text("Thank you for your business.", { x: 48, y: 128 })
 *     ])
 *   ], { title: "Invoice" })
 *   return yield* Pdf.encode(doc)
 * })
 * ```
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.2
 */
export const encode = (document: Document, options?: {
  readonly compress?: boolean | undefined
}): Effect.Effect<Uint8Array, PdfError> =>
  Effect.suspend(() => {
    let writer: Writer
    try {
      writer = build(document)
    } catch (error) {
      if (isPdfError(error)) return Effect.fail(error)
      throw error
    }
    return finish(writer, options?.compress ?? true)
  })

// -----------------------------------------------------------------------------
// Text
// -----------------------------------------------------------------------------

const black = gray(0)

// Distance of the Bézier control points that approximate a quarter circle
const KAPPA = 0.5522847498

// Unicode code points of WinAnsiEncoding codes 128 to 159
const WIN_ANSI_HIGH = [
  0x20AC,
  -1,
  0x201A,
  0x0192,
  0x201E,
  0x2026,
  0x2020,
  0x2021,
  0x02C6,
  0x2030,
  0x0160,
  0x2039,
  0x0152,
  -1,
  0x017D,
  -1,
  -1,
  0x2018,
  0x2019,
  0x201C,
  0x201D,
  0x2022,
  0x2013,
  0x2014,
  0x02DC,
  0x2122,
  0x0161,
  0x203A,
  0x0153,
  -1,
  0x017E,
  0x0178
]

const WIN_ANSI_CODES = new Map<number, number>(
  WIN_ANSI_HIGH.flatMap((codePoint, index) => codePoint === -1 ? [] : [[codePoint, 128 + index] as const])
)

// Returns the WinAnsiEncoding code of a code point, or -1 if it has none.
// Tabs are shown as spaces.
const winAnsi = (codePoint: number): number => {
  if (codePoint >= 0x20 && codePoint <= 0x7E) return codePoint
  if (codePoint >= 0xA0 && codePoint <= 0xFF) return codePoint
  if (codePoint === 0x09) return 0x20
  return WIN_ANSI_CODES.get(codePoint) ?? -1
}

// Widths are summed in font units and scaled once, so that measurements are exact
const charUnits = (char: string, metrics: FontMetrics): number => {
  const code = winAnsi(char.codePointAt(0)!)
  return code === -1 ? 0 : metrics.widths[code - 32]
}

const lineWidth = (line: string, metrics: FontMetrics, size: number): number => {
  let units = 0
  for (const char of line) units += charUnits(char, metrics)
  return units * size / 1000
}

interface Line {
  readonly text: string
  // Whether the line ends a paragraph, so it is not justified
  readonly last: boolean
}

const layout = (text: string, metrics: FontMetrics, size: number, maxWidth: number | undefined): Array<Line> => {
  const paragraphs = text.split(/\r\n|\r|\n/)
  const lines: Array<Line> = []
  for (const paragraph of paragraphs) {
    if (maxWidth === undefined) {
      lines.push({ text: paragraph, last: true })
      continue
    }
    const fits = (candidate: string) => lineWidth(candidate, metrics, size) <= maxWidth
    // Splits words wider than the line at the last character that fits
    const split = (line: string): string => {
      while (!fits(line)) {
        const chars = Array.from(line)
        let end = 1
        let units = charUnits(chars[0], metrics)
        while (end < chars.length) {
          units += charUnits(chars[end], metrics)
          if (units * size / 1000 > maxWidth) break
          end++
        }
        if (end === chars.length) break
        lines.push({ text: chars.slice(0, end).join(""), last: false })
        line = chars.slice(end).join("")
      }
      return line
    }
    // Words at even indices, the whitespace between them at odd indices
    const parts = paragraph.split(/([ \t]+)/)
    let line = split(parts[0])
    for (let i = 1; i < parts.length; i += 2) {
      const word = parts[i + 1]
      const candidate = line + parts[i] + word
      if (word === "" || fits(candidate)) {
        line = candidate
      } else {
        lines.push({ text: line, last: false })
        line = split(word)
      }
    }
    lines.push({ text: line, last: true })
  }
  return lines
}

// -----------------------------------------------------------------------------
// Images
// -----------------------------------------------------------------------------

interface JpegImage extends Image {
  readonly format: "jpeg"
  readonly components: number
  // Whether CMYK samples are stored inverted, as Adobe applications write them
  readonly inverted: boolean
  readonly data: Uint8Array
}

interface PngImage extends Image {
  readonly format: "png"
  readonly bitDepth: number
  readonly colorType: number
  readonly interlaced: boolean
  readonly palette: Uint8Array | undefined
  readonly transparency: Uint8Array | undefined
  // Concatenated IDAT chunks
  readonly data: Uint8Array
}

// Images read by `jpeg` and `png`, so `encode` can reject other objects
const images = new WeakSet<Image>()

const makeImage = <A extends JpegImage | PngImage>(image: A): A => {
  images.add(image)
  return image
}

const invalidImage = (message: string) => new PdfError({ kind: "InvalidImage", message })

const readJpeg = (bytes: Uint8Array): Effect.Effect<Image, PdfError> => {
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return Effect.fail(invalidImage("image is not a JPEG file"))
  }
  let inverted = false
  let at = 2
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xFF) return Effect.fail(invalidImage(`invalid JPEG marker at byte ${at}`))
    const marker = bytes[at + 1]
    if (marker === 0xFF) {
      at++
      continue
    }
    // Markers without a segment
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD8)) {
      at += 2
      continue
    }
    const length = (bytes[at + 2] << 8) | bytes[at + 3]
    const start = at + 4
    if (length < 2 || at + 2 + length > bytes.length) break
    // An APP14 segment from Adobe means that CMYK data is stored inverted
    if (marker === 0xEE && length >= 7 && String.fromCharCode(...bytes.subarray(start, start + 5)) === "Adobe") {
      inverted = true
    }
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      if (length < 8) break
      const precision = bytes[start]
      const height = (bytes[start + 1] << 8) | bytes[start + 2]
      const width = (bytes[start + 3] << 8) | bytes[start + 4]
      const components = bytes[start + 5]
      if (precision !== 8) {
        return Effect.fail(invalidImage(`JPEG images with ${precision}-bit samples are not supported`))
      }
      if (width === 0 || height === 0) return Effect.fail(invalidImage("JPEG image has no size in its frame header"))
      if (components !== 1 && components !== 3 && components !== 4) {
        return Effect.fail(invalidImage(`JPEG images with ${components} components are not supported`))
      }
      return Effect.succeed(makeImage<JpegImage>({ format: "jpeg", width, height, components, inverted, data: bytes }))
    }
    if ((marker >= 0xC3 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC)) {
      return Effect.fail(invalidImage("lossless and arithmetic-coded JPEG images are not supported"))
    }
    if (marker === 0xDA) break
    at += 2 + length
  }
  return Effect.fail(invalidImage("JPEG image has no frame header"))
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]

const PNG_BIT_DEPTHS: Record<number, ReadonlyArray<number>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16]
}

const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

const readPng = (bytes: Uint8Array): Effect.Effect<Image, PdfError> => {
  if (bytes.length < 8 || PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)) {
    return Effect.fail(invalidImage("image is not a PNG file"))
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let header: Uint8Array | undefined
  let palette: Uint8Array | undefined
  let transparency: Uint8Array | undefined
  const data: Array<Uint8Array> = []
  let dataLength = 0
  let ended = false
  let at = 8
  while (at + 12 <= bytes.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7])
    const start = at + 8
    if (start + length + 4 > bytes.length) break
    const chunk = bytes.subarray(start, start + length)
    if (type === "IHDR") header = chunk
    else if (type === "PLTE") palette = chunk
    else if (type === "tRNS") transparency = chunk
    else if (type === "IDAT") {
      data.push(chunk)
      dataLength += length
    } else if (type === "IEND") {
      ended = true
      break
    }
    at = start + length + 4
  }
  if (header === undefined || header.length !== 13) return Effect.fail(invalidImage("PNG image has no IHDR chunk"))
  if (!ended || data.length === 0) return Effect.fail(invalidImage("PNG image is truncated"))
  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const width = headerView.getUint32(0)
  const height = headerView.getUint32(4)
  const bitDepth = header[8]
  const colorType = header[9]
  const interlace = header[12]
  if (width === 0 || height === 0) return Effect.fail(invalidImage("PNG image has no pixels"))
  if (!PNG_BIT_DEPTHS[colorType]?.includes(bitDepth)) {
    return Effect.fail(invalidImage(`invalid PNG color type ${colorType} with bit depth ${bitDepth}`))
  }
  if (header[10] !== 0 || header[11] !== 0 || interlace > 1) {
    return Effect.fail(invalidImage("PNG image uses an unknown compression, filter or interlace method"))
  }
  if (colorType === 3 && (palette === undefined || palette.length % 3 !== 0 || palette.length === 0)) {
    return Effect.fail(invalidImage("indexed PNG image has no valid palette"))
  }
  return Effect.succeed(
    makeImage<PngImage>({
      format: "png",
      width,
      height,
      bitDepth,
      colorType,
      interlaced: interlace === 1,
      palette: colorType === 3 ? palette : undefined,
      transparency,
      data: concat(data, dataLength)
    })
  )
}

// Adam7 passes: starting column, starting row, column step, row step
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2]
] as const

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

// Reverses the PNG row filters of one image or interlace pass in place,
// returning the offset after its last row
const unfilter = (data: Uint8Array, at: number, rowBytes: number, rows: number, pixelBytes: number): number => {
  let previous = -1
  for (let row = 0; row < rows; row++) {
    if (at + 1 + rowBytes > data.length) throw invalidImage("PNG image data is truncated")
    const filter = data[at]
    const start = at + 1
    for (let i = 0; i < rowBytes; i++) {
      const left = i >= pixelBytes ? data[start + i - pixelBytes] : 0
      const up = previous === -1 ? 0 : data[previous + i]
      const upLeft = previous === -1 || i < pixelBytes ? 0 : data[previous + i - pixelBytes]
      let value = data[start + i]
      switch (filter) {
        case 0:
          break
        case 1:
          value += left
          break
        case 2:
          value += up
          break
        case 3:
          value += (left + up) >> 1
          break
        case 4:
          value += paeth(left, up, upLeft)
          break
        default:
          throw invalidImage(`invalid PNG filter type ${filter}`)
      }
      data[start + i] = value
    }
    previous = start
    at = start + rowBytes
  }
  return at
}

// Decodes inflated PNG data to rows of packed pixels without filter bytes
const unfilterImage = (image: PngImage, data: Uint8Array): Uint8Array => {
  const bitsPerPixel = PNG_CHANNELS[image.colorType] * image.bitDepth
  const pixelBytes = Math.max(1, bitsPerPixel >> 3)
  const rowBytes = (image.width * bitsPerPixel + 7) >> 3
  const out = new Uint8Array(rowBytes * image.height)
  if (!image.interlaced) {
    unfilter(data, 0, rowBytes, image.height, pixelBytes)
    for (let row = 0; row < image.height; row++) {
      out.set(data.subarray(row * (rowBytes + 1) + 1, (row + 1) * (rowBytes + 1)), row * rowBytes)
    }
    return out
  }
  let at = 0
  for (const [x0, y0, dx, dy] of ADAM7) {
    const columns = Math.ceil((image.width - x0) / dx)
    const rows = Math.ceil((image.height - y0) / dy)
    if (columns <= 0 || rows <= 0) continue
    const passRowBytes = (columns * bitsPerPixel + 7) >> 3
    const start = at
    at = unfilter(data, at, passRowBytes, rows, pixelBytes)
    for (let row = 0; row < rows; row++) {
      const source = start + row * (passRowBytes + 1) + 1
      const target = (y0 + row * dy) * rowBytes
      for (let column = 0; column < columns; column++) {
        const x = x0 + column * dx
        if (bitsPerPixel >= 8) {
          out.set(
            data.subarray(source + column * pixelBytes, source + (column + 1) * pixelBytes),
            target + x * pixelBytes
          )
        } else {
          const sourceBit = column * bitsPerPixel
          const value = (data[source + (sourceBit >> 3)] >> (8 - bitsPerPixel - (sourceBit & 7))) &
            ((1 << bitsPerPixel) - 1)
          const targetBit = x * bitsPerPixel
          out[target + (targetBit >> 3)] |= value << (8 - bitsPerPixel - (targetBit & 7))
        }
      }
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

const invalidValue = (message: string) => new PdfError({ kind: "InvalidValue", message })

const num = (n: number): string => {
  if (!Number.isFinite(n)) throw invalidValue(`expected a finite number, got ${n}`)
  const fixed = n.toFixed(4)
  if (fixed.includes("e")) throw invalidValue(`number ${n} is too large`)
  const trimmed = fixed.replace(/\.?0+$/, "")
  return trimmed === "-0" ? "0" : trimmed
}

const unit = (n: number, name: string): string => {
  if (!(n >= 0 && n <= 1)) throw invalidValue(`${name} must be between 0 and 1, got ${n}`)
  return num(n)
}

const positive = (n: number, name: string): number => {
  if (!(n > 0 && Number.isFinite(n))) throw invalidValue(`${name} must be a positive number, got ${n}`)
  return n
}

const colorOperator = (color: Color, stroke: boolean): string => {
  switch (color._tag) {
    case "Gray":
      return `${unit(color.gray, "gray")} ${stroke ? "G" : "g"}`
    case "Rgb":
      return `${unit(color.red, "red")} ${unit(color.green, "green")} ${unit(color.blue, "blue")} ${
        stroke ? "RG" : "rg"
      }`
    case "Cmyk":
      return `${unit(color.cyan, "cyan")} ${unit(color.magenta, "magenta")} ${unit(color.yellow, "yellow")} ${
        unit(color.black, "black")
      } ${stroke ? "K" : "k"}`
  }
}

const hex = (bytes: Uint8Array): string => {
  let out = "<"
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0")
  return out + ">"
}

// Text strings outside the content stream: ASCII as literals, anything else
// as UTF-16BE
const textString = (value: string): string => {
  if (/^[\x20-\x7E]*$/.test(value)) return `(${value.replace(/[\\()]/g, "\\$&")})`
  const bytes = new Uint8Array(2 + value.length * 2)
  bytes[0] = 0xFE
  bytes[1] = 0xFF
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i)
    bytes[2 + i * 2] = unit >> 8
    bytes[3 + i * 2] = unit & 0xFF
  }
  return hex(bytes)
}

const dateString = (date: Date): string => {
  if (Number.isNaN(date.getTime())) throw invalidValue("invalid date")
  const pad = (n: number, length = 2) => String(n).padStart(length, "0")
  return `(D:${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${
    pad(date.getUTCHours())
  }${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z)`
}

const encoder = new TextEncoder()

// URIs are 7-bit ASCII, so other characters are percent-encoded as UTF-8
const uriString = (url: string): string => {
  let out = ""
  for (const char of url) {
    const code = char.codePointAt(0)!
    if (code >= 0x20 && code <= 0x7E) out += char
    else for (const byte of encoder.encode(char)) out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`
  }
  return `(${out.replace(/[\\()]/g, "\\$&")})`
}

const encodeLine = (line: string): Uint8Array => {
  const bytes: Array<number> = []
  for (const char of line) {
    const codePoint = char.codePointAt(0)!
    const code = winAnsi(codePoint)
    if (code === -1) {
      throw new PdfError({
        kind: "UnsupportedCharacter",
        message: `${JSON.stringify(char)} (U+${
          codePoint.toString(16).toUpperCase().padStart(4, "0")
        }) cannot be shown in the standard fonts`
      })
    }
    bytes.push(code)
  }
  return new Uint8Array(bytes)
}

// Contents of an indirect object: a dictionary, followed by a stream when
// `stream` is set
interface PdfObject {
  dictionary: string
  stream?: Uint8Array | undefined
  // Whether the stream may be compressed
  compressible?: boolean | undefined
}

interface Pending {
  readonly image: PngImage
  readonly id: number
  readonly mask: number | undefined
}

class Writer {
  // Reference to the document information dictionary in the trailer
  info = ""
  readonly objects: Array<PdfObject | undefined> = [undefined]
  readonly fonts = new Map<string, string>()
  readonly fontRefs: Array<string> = []
  readonly images = new Map<Image, string>()
  readonly imageRefs: Array<string> = []
  readonly states = new Map<string, string>()
  // Decoded PNG images, filled in by `finish`
  readonly pending: Array<Pending> = []

  reserve(): number {
    this.objects.push(undefined)
    return this.objects.length - 1
  }

  add(object: PdfObject): number {
    this.objects.push(object)
    return this.objects.length - 1
  }

  font(name: Font): string {
    let resource = this.fonts.get(name)
    if (resource === undefined) {
      if (!Object.hasOwn(fontMetrics, name)) throw invalidValue(`unknown font ${JSON.stringify(name)}`)
      resource = `F${this.fonts.size + 1}`
      const id = this.add({
        dictionary: `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`
      })
      this.fonts.set(name, resource)
      this.fontRefs.push(`/${resource} ${id} 0 R`)
    }
    return resource
  }

  state(opacity: number): string {
    const value = unit(opacity, "opacity")
    let resource = this.states.get(value)
    if (resource === undefined) {
      resource = `GS${this.states.size + 1}`
      this.states.set(value, resource)
    }
    return resource
  }

  image(image: Image): string {
    let resource = this.images.get(image)
    if (resource !== undefined) return resource
    resource = `Im${this.images.size + 1}`
    let id: number
    if (!images.has(image)) throw invalidValue("images must be read with jpeg or png")
    const internal = image as JpegImage | PngImage
    if (internal.format === "jpeg") {
      const colorSpace = internal.components === 1
        ? "DeviceGray"
        : internal.components === 3
        ? "DeviceRGB"
        : "DeviceCMYK"
      const decode = internal.components === 4 && internal.inverted ? " /Decode [1 0 1 0 1 0 1 0]" : ""
      id = this.add({
        dictionary:
          `<< /Type /XObject /Subtype /Image /Width ${internal.width} /Height ${internal.height} /ColorSpace /${colorSpace} /BitsPerComponent 8${decode} /Filter /DCTDecode`,
        stream: internal.data
      })
    } else {
      id = this.png(internal)
    }
    this.images.set(image, resource)
    this.imageRefs.push(`/${resource} ${id} 0 R`)
    return resource
  }

  png(image: PngImage): number {
    const colorSpace = image.colorType === 3
      ? `[/Indexed /DeviceRGB ${image.palette!.length / 3 - 1} ${hex(image.palette!)}]`
      : image.colorType === 0 || image.colorType === 4
      ? "/DeviceGray"
      : "/DeviceRGB"
    const alpha = image.colorType === 4 || image.colorType === 6 ||
      (image.colorType === 3 && image.transparency !== undefined)
    // Color key masking for gray and RGB images with a tRNS chunk
    let mask = ""
    if ((image.colorType === 0 || image.colorType === 2) && image.transparency !== undefined) {
      const keys: Array<number> = []
      for (let i = 0; i + 1 < image.transparency.length; i += 2) {
        const key = (image.transparency[i] << 8) | image.transparency[i + 1]
        keys.push(key, key)
      }
      mask = ` /Mask [${keys.join(" ")}]`
    }
    const dictionary =
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace ${colorSpace} /BitsPerComponent ${image.bitDepth}${mask}`
    if (!alpha && !image.interlaced) {
      const colors = PNG_CHANNELS[image.colorType]
      return this.add({
        dictionary:
          `${dictionary} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${image.bitDepth} /Columns ${image.width} >>`,
        stream: image.data
      })
    }
    const maskId = alpha ? this.reserve() : undefined
    const id = this.add({ dictionary: maskId === undefined ? dictionary : `${dictionary} /SMask ${maskId} 0 R` })
    this.pending.push({ image, id, mask: maskId })
    return id
  }

  serialize(): Uint8Array {
    const chunks: Array<Uint8Array> = []
    let length = 0
    const write = (chunk: string | Uint8Array) => {
      const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk
      chunks.push(bytes)
      length += bytes.length
    }
    write("%PDF-1.7\n")
    write(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]))
    const offsets: Array<number> = []
    for (let id = 1; id < this.objects.length; id++) {
      const object = this.objects[id]!
      offsets.push(length)
      write(`${id} 0 obj\n`)
      if (object.stream === undefined) {
        write(`${object.dictionary}\nendobj\n`)
      } else {
        // Stream dictionaries are left open so filters can be appended
        write(`${object.dictionary} /Length ${object.stream.length} >>\nstream\n`)
        write(object.stream)
        write("\nendstream\nendobj\n")
      }
    }
    const xref = length
    let table = `xref\n0 ${this.objects.length}\n0000000000 65535 f \n`
    for (const offset of offsets) table += `${String(offset).padStart(10, "0")} 00000 n \n`
    write(table)
    write(`trailer\n<< /Size ${this.objects.length} /Root 1 0 R${this.info} >>\nstartxref\n${xref}\n%%EOF\n`)
    return concat(chunks, length)
  }
}

const build = (document: Document): Writer => {
  const writer = new Writer()
  const catalog = writer.reserve()
  const pages = writer.reserve()
  const resources = writer.reserve()
  const pageIds: Array<number> = []
  for (const page of document.pages) {
    const width = positive(page.size.width, "page width")
    const height = positive(page.size.height, "page height")
    const y = (value: number) => num(height - value)
    const ops: Array<string | Uint8Array> = []
    const annotations: Array<number> = []
    for (const content of page.content) {
      switch (content._tag) {
        case "Text": {
          const font = writer.font(content.font)
          const metrics = fontMetrics[content.font]
          const size = positive(content.size, "font size")
          const lineHeight = content.lineHeight * size
          const lines = layout(content.text, metrics, size, content.width)
          const box = content.width ?? Math.max(0, ...lines.map((line) => lineWidth(line.text, metrics, size)))
          // Centers the glyphs, from ascender to descender, in each line box
          const baseline = (lineHeight - (metrics.ascender - metrics.descender) * size / 1000) / 2 +
            metrics.ascender * size / 1000
          ops.push("q\n")
          if (content.opacity !== undefined) ops.push(`/${writer.state(content.opacity)} gs\n`)
          ops.push(`BT\n/${font} ${num(size)} Tf\n${colorOperator(content.color, false)}\n`)
          let spacing = 0
          lines.forEach((line, index) => {
            const width = lineWidth(line.text, metrics, size)
            let x = content.x
            let wordSpacing = 0
            if (content.align === "center") x += (box - width) / 2
            else if (content.align === "right") x += box - width
            else if (content.align === "justify" && !line.last && content.width !== undefined) {
              const spaces = line.text.match(/[ \t]/g)?.length ?? 0
              if (spaces > 0) wordSpacing = (box - width) / spaces
            }
            if (wordSpacing !== spacing) {
              ops.push(`${num(wordSpacing)} Tw\n`)
              spacing = wordSpacing
            }
            ops.push(`1 0 0 1 ${num(x)} ${y(content.y + index * lineHeight + baseline)} Tm\n`)
            ops.push(`${hex(encodeLine(line.text))} Tj\n`)
          })
          ops.push("ET\nQ\n")
          break
        }
        case "Path": {
          const style = content.style
          const fill = style.fill
          const stroke = style.stroke ?? (fill === undefined ? black : undefined)
          ops.push("q\n")
          if (style.opacity !== undefined) ops.push(`/${writer.state(style.opacity)} gs\n`)
          if (fill !== undefined) ops.push(`${colorOperator(fill, false)}\n`)
          if (stroke !== undefined) {
            ops.push(`${colorOperator(stroke, true)}\n${num(style.lineWidth ?? 1)} w\n`)
            if (style.lineCap !== undefined) ops.push(`${["butt", "round", "square"].indexOf(style.lineCap)} J\n`)
            if (style.lineJoin !== undefined) ops.push(`${["miter", "round", "bevel"].indexOf(style.lineJoin)} j\n`)
            if (style.dash !== undefined) ops.push(`[${style.dash.map(num).join(" ")}] 0 d\n`)
          }
          for (const segment of content.segments) {
            switch (segment._tag) {
              case "MoveTo":
                ops.push(`${num(segment.x)} ${y(segment.y)} m\n`)
                break
              case "LineTo":
                ops.push(`${num(segment.x)} ${y(segment.y)} l\n`)
                break
              case "CurveTo":
                ops.push(
                  `${num(segment.x1)} ${y(segment.y1)} ${num(segment.x2)} ${y(segment.y2)} ${num(segment.x)} ${
                    y(segment.y)
                  } c\n`
                )
                break
              case "Close":
                ops.push("h\n")
                break
            }
          }
          const evenOdd = style.fillRule === "evenodd" ? "*" : ""
          ops.push(
            fill !== undefined && stroke !== undefined ? `B${evenOdd}\n` : fill !== undefined ? `f${evenOdd}\n` : "S\n"
          )
          ops.push("Q\n")
          break
        }
        case "Image": {
          const resource = writer.image(content.image)
          ops.push("q\n")
          if (content.opacity !== undefined) ops.push(`/${writer.state(content.opacity)} gs\n`)
          ops.push(
            `${num(content.width)} 0 0 ${num(content.height)} ${num(content.x)} ${
              y(content.y + content.height)
            } cm\n/${resource} Do\nQ\n`
          )
          break
        }
        case "Link": {
          const x1 = Math.min(content.x, content.x + content.width)
          const x2 = Math.max(content.x, content.x + content.width)
          const top = Math.min(content.y, content.y + content.height)
          const bottom = Math.max(content.y, content.y + content.height)
          annotations.push(writer.add({
            dictionary: `<< /Type /Annot /Subtype /Link /Rect [${num(x1)} ${y(bottom)} ${num(x2)} ${
              y(top)
            }] /Border [0 0 0] /A << /Type /Action /S /URI /URI ${uriString(content.url)} >> >>`
          }))
          break
        }
      }
    }
    let streamLength = 0
    const streamChunks = ops.map((op) => {
      const bytes = typeof op === "string" ? encoder.encode(op) : op
      streamLength += bytes.length
      return bytes
    })
    const contents = writer.add({ dictionary: "<<", stream: concat(streamChunks, streamLength), compressible: true })
    const annots = annotations.length === 0 ? "" : ` /Annots [${annotations.map((id) => `${id} 0 R`).join(" ")}]`
    pageIds.push(writer.add({
      dictionary: `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${num(width)} ${
        num(height)
      }] /Resources ${resources} 0 R /Contents ${contents} 0 R${annots} >>`
    }))
  }
  writer.objects[catalog] = { dictionary: `<< /Type /Catalog /Pages ${pages} 0 R >>` }
  writer.objects[pages] = {
    dictionary: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
  }
  const states = Array.from(
    writer.states,
    ([opacity, name]) => `/${name} << /Type /ExtGState /ca ${opacity} /CA ${opacity} >>`
  )
  writer.objects[resources] = {
    dictionary: `<<${writer.fontRefs.length === 0 ? "" : ` /Font << ${writer.fontRefs.join(" ")} >>`}${
      writer.imageRefs.length === 0 ? "" : ` /XObject << ${writer.imageRefs.join(" ")} >>`
    }${states.length === 0 ? "" : ` /ExtGState << ${states.join(" ")} >>`} >>`
  }
  const info = document.info
  const entries: Array<string> = []
  const field = (key: string, value: string | undefined) => {
    if (value !== undefined) entries.push(`/${key} ${textString(value)}`)
  }
  field("Title", info.title)
  field("Author", info.author)
  field("Subject", info.subject)
  field("Keywords", info.keywords)
  field("Creator", info.creator)
  field("Producer", info.producer)
  if (info.creationDate !== undefined) entries.push(`/CreationDate ${dateString(info.creationDate)}`)
  if (info.modificationDate !== undefined) entries.push(`/ModDate ${dateString(info.modificationDate)}`)
  if (entries.length > 0) writer.info = ` /Info ${writer.add({ dictionary: `<< ${entries.join(" ")} >>` })} 0 R`
  return writer
}

const decodePng = Effect.fnUntraced(function*(writer: Writer, entry: Pending) {
  const { image } = entry
  const inflated = yield* Effect.tryPromise({
    try: () => transform(new DecompressionStream("deflate"), image.data),
    catch: () => invalidImage("PNG image data is corrupt")
  })
  const pixels = yield* Effect.try({
    try: () => unfilterImage(image, inflated),
    catch: (error) => isPdfError(error) ? error : invalidImage("PNG image data is corrupt")
  })
  const object = writer.objects[entry.id]!
  if (entry.mask === undefined) {
    object.stream = pixels
    object.compressible = true
    return
  }
  const pixelCount = image.width * image.height
  let color: Uint8Array
  let alpha: Uint8Array
  let alphaDepth = image.bitDepth
  if (image.colorType === 3) {
    // Palette transparency: one alpha byte per palette entry, opaque when missing
    color = pixels
    alpha = new Uint8Array(pixelCount)
    alphaDepth = 8
    const rowBytes = (image.width * image.bitDepth + 7) >> 3
    const max = (1 << image.bitDepth) - 1
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const bit = x * image.bitDepth
        const index = (pixels[y * rowBytes + (bit >> 3)] >> (8 - image.bitDepth - (bit & 7))) & max
        alpha[y * image.width + x] = image.transparency![index] ?? 255
      }
    }
  } else {
    const sampleBytes = image.bitDepth >> 3
    const colorBytes = (PNG_CHANNELS[image.colorType] - 1) * sampleBytes
    const pixelBytes = colorBytes + sampleBytes
    color = new Uint8Array(pixelCount * colorBytes)
    alpha = new Uint8Array(pixelCount * sampleBytes)
    for (let i = 0; i < pixelCount; i++) {
      color.set(pixels.subarray(i * pixelBytes, i * pixelBytes + colorBytes), i * colorBytes)
      alpha.set(pixels.subarray(i * pixelBytes + colorBytes, (i + 1) * pixelBytes), i * sampleBytes)
    }
  }
  object.stream = color
  object.compressible = true
  writer.objects[entry.mask] = {
    dictionary:
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent ${alphaDepth}`,
    stream: alpha,
    compressible: true
  }
})

const finish = Effect.fnUntraced(function*(writer: Writer, compress: boolean) {
  yield* Effect.forEach(writer.pending, (entry) => decodePng(writer, entry), { concurrency: 4, discard: true })
  if (compress) {
    yield* Effect.forEach(writer.objects, (object) => {
      if (object?.stream === undefined || !object.compressible) return Effect.void
      const stream = object.stream
      return Effect.map(
        Effect.promise(() => transform(new CompressionStream("deflate"), stream)),
        (compressed) => {
          object.stream = compressed
          object.dictionary += " /Filter /FlateDecode"
        }
      )
    }, { concurrency: 16, discard: true })
  }
  return writer.serialize()
})

// CompressionStream rejects views of a SharedArrayBuffer
const transformable = (bytes: Uint8Array): Uint8Array<ArrayBuffer> =>
  bytes.buffer instanceof ArrayBuffer ? bytes as Uint8Array<ArrayBuffer> : bytes.slice()

const transform = async (
  stream: CompressionStream | DecompressionStream,
  bytes: Uint8Array
): Promise<Uint8Array> => {
  const writer = stream.writable.getWriter()
  // A failed write errors the readable, so the reads report it
  if (bytes.length > 0) writer.write(transformable(bytes)).catch(() => {})
  writer.close().catch(() => {})
  const reader = stream.readable.getReader()
  const chunks: Array<Uint8Array> = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    length += value.length
  }
  return concat(chunks, length)
}

const concat = (chunks: ReadonlyArray<Uint8Array>, length: number): Uint8Array => {
  if (chunks.length === 1) return chunks[0]
  const out = new Uint8Array(length)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}
