/**
 * Writes PDF documents made of text, shapes, images and links.
 *
 * A document is plain data: build its pages from the content constructors
 * (`text`, `rectangle`, `line`, `ellipse`, `path`, `image` and `link`), then
 * turn it into PDF bytes with `encode`. Positions and sizes are in points, 1/72
 * of an inch, measured from the top-left corner of the page with `y` growing
 * downward.
 *
 * Text is set in the twelve standard Helvetica, Times and Courier fonts that
 * every PDF reader provides, so no font data is embedded. These fonts cover
 * the characters of Windows-1252 (Latin-1 plus a few such as `€`, `“` and
 * `—`). `measureText` and `layoutText` use the same font metrics as readers,
 * so text can be measured and wrapped before it is placed.
 *
 * Images can be JPEG or PNG. JPEG data, and PNG data without an alpha channel,
 * is embedded as it is; PNG data with an alpha channel is decoded so that the
 * alpha can become a soft mask.
 *
 * This module is experimental and may receive breaking changes in patch
 * releases.
 *
 * @stability experimental
 * @since 4.1.2
 */
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import { ByteQueue, InflateError, InflateMemory, Inflater, NeedInput } from "../internal/inflate.ts"
import { metrics } from "../internal/pdfFonts.ts"
import * as Predicate from "../Predicate.ts"

const PdfErrorTypeId = "~effect/encoding/Pdf/PdfError"

/**
 * Error raised when a document cannot be encoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `InvalidContent`: a page, content item or document property has a value
 *   that cannot be written, such as a negative size, a non-finite coordinate
 *   or a malformed color.
 * - `UnsupportedCharacter`: text contains a character the standard fonts do
 *   not have.
 * - `InvalidImage`: image data is not a well-formed JPEG or PNG image.
 * - `UnsupportedImage`: an image uses a feature this module does not write,
 *   such as PNG interlacing or 12-bit JPEG samples.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.2
 */
export class PdfError extends Data.TaggedError("PdfError")<{
  readonly kind: "InvalidContent" | "UnsupportedCharacter" | "InvalidImage" | "UnsupportedImage"
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
 * One of the standard fonts that PDF readers provide.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export type StandardFont =
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
 * An RGB color written as a hex string, such as `"#1f6feb"` or `"#000"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export type Color = `#${string}`

/**
 * Width and height in points.
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
 * @category page sizes
 * @since 4.1.2
 */
export const A3: Size = { width: 841.89, height: 1190.55 }

/**
 * ISO A4 page size, 210 × 297 mm.
 *
 * @stability experimental
 * @category page sizes
 * @since 4.1.2
 */
export const A4: Size = { width: 595.28, height: 841.89 }

/**
 * ISO A5 page size, 148 × 210 mm.
 *
 * @stability experimental
 * @category page sizes
 * @since 4.1.2
 */
export const A5: Size = { width: 419.53, height: 595.28 }

/**
 * US Letter page size, 8.5 × 11 in.
 *
 * @stability experimental
 * @category page sizes
 * @since 4.1.2
 */
export const Letter: Size = { width: 612, height: 792 }

/**
 * US Legal page size, 8.5 × 14 in.
 *
 * @stability experimental
 * @category page sizes
 * @since 4.1.2
 */
export const Legal: Size = { width: 612, height: 1008 }

/**
 * Returns the landscape orientation of a page size: its longer side becomes
 * the width.
 *
 * @stability experimental
 * @category page sizes
 * @since 4.1.2
 */
export const landscape = (size: Size): Size => ({
  width: Math.max(size.width, size.height),
  height: Math.min(size.width, size.height)
})

/**
 * Font settings used to measure and place text.
 *
 * **Details**
 *
 * `font` defaults to `"Helvetica"` and `size` to 12 points. `lineHeight` is
 * the distance between baselines as a multiple of `size`, and defaults to
 * 1.2.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface TextStyle {
  readonly font?: StandardFont | undefined
  readonly size?: number | undefined
  readonly lineHeight?: number | undefined
}

/**
 * Text placed on a page.
 *
 * **Details**
 *
 * `x` and `y` are the top-left corner of the first line. Each line is
 * `size * lineHeight` tall and its glyphs are centered vertically in it, as
 * in CSS. Lines break at `\n`, and also between words when `width` is set; a
 * word wider than `width` is broken between characters.
 *
 * `align` places each line within `width`. Without `width`, `"center"` and
 * `"right"` put the center or the right end of each line at `x`.
 *
 * @see {@link text} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Text extends TextStyle {
  readonly _tag: "Text"
  readonly text: string
  readonly x: number
  readonly y: number
  readonly width?: number | undefined
  readonly align?: "left" | "center" | "right" | undefined
  readonly color?: Color | undefined
}

/**
 * Fill and outline of a closed shape.
 *
 * **Details**
 *
 * A shape with neither `fill` nor `stroke` is outlined in black. `lineWidth`
 * defaults to 1 point.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface ShapeStyle {
  readonly fill?: Color | undefined
  readonly stroke?: Color | undefined
  readonly lineWidth?: number | undefined
}

/**
 * Rectangle whose top-left corner is at `x` and `y`.
 *
 * @see {@link rectangle} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Rectangle extends ShapeStyle {
  readonly _tag: "Rectangle"
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Ellipse that fills the box whose top-left corner is at `x` and `y`.
 *
 * @see {@link ellipse} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Ellipse extends ShapeStyle {
  readonly _tag: "Ellipse"
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Straight line from `x1`, `y1` to `x2`, `y2`.
 *
 * **Details**
 *
 * `color` defaults to black and `lineWidth` to 1 point. `dash` alternates the
 * lengths of dashes and gaps, as in `[3, 2]`.
 *
 * @see {@link line} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Line {
  readonly _tag: "Line"
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly color?: Color | undefined
  readonly lineWidth?: number | undefined
  readonly dash?: ReadonlyArray<number> | undefined
}

/**
 * Line through a list of points.
 *
 * **Details**
 *
 * `closed` joins the last point back to the first. A filled path is always
 * filled as if it were closed.
 *
 * @see {@link path} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Path extends ShapeStyle {
  readonly _tag: "Path"
  readonly points: ReadonlyArray<readonly [x: number, y: number]>
  readonly closed?: boolean | undefined
}

/**
 * JPEG or PNG image whose top-left corner is at `x` and `y`.
 *
 * **Details**
 *
 * When only one of `width` and `height` is set, the other keeps the aspect
 * ratio of the image. When neither is set, each pixel is one point. Images
 * with the same `data` object are embedded once.
 *
 * @see {@link image} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Image {
  readonly _tag: "Image"
  readonly data: Uint8Array
  readonly x: number
  readonly y: number
  readonly width?: number | undefined
  readonly height?: number | undefined
}

/**
 * Area that opens `url` when clicked.
 *
 * @see {@link link} for the constructor
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
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
 * Anything that can be placed on a page.
 *
 * **Details**
 *
 * Content is drawn in order, so later items cover earlier ones.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export type Content = Text | Rectangle | Ellipse | Line | Path | Image | Link

/**
 * Page of a document.
 *
 * @see {@link page} for the constructor
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
 * Document properties shown by PDF readers.
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
}

/**
 * A PDF document: its pages and properties.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface Document {
  readonly pages: ReadonlyArray<Page>
  readonly info?: Info | undefined
}

/**
 * Options for `encode`.
 *
 * **Details**
 *
 * `compress` defaults to `true`, which compresses page content and decoded
 * images with the runtime's `CompressionStream("deflate")`. With `false`, the
 * output only depends on the document, so it is the same on every runtime.
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface EncodeOptions {
  readonly compress?: boolean | undefined
}

/**
 * Lines of text broken as `text` would place them, with the size of the block
 * they fill.
 *
 * @see {@link layoutText} for computing a layout
 *
 * @stability experimental
 * @category models
 * @since 4.1.2
 */
export interface TextLayout {
  readonly lines: ReadonlyArray<string>
  readonly width: number
  readonly height: number
}

/**
 * Creates a page.
 *
 * **Details**
 *
 * `size` defaults to `A4`.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const page = (content: ReadonlyArray<Content>, options?: { readonly size?: Size | undefined }): Page => ({
  size: options?.size ?? A4,
  content
})

/**
 * Creates text content.
 *
 * @see {@link Text} for how text is placed
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const text = (text: string, options: Omit<Text, "_tag" | "text">): Text => ({
  ...options,
  _tag: "Text",
  text
})

/**
 * Creates a rectangle.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const rectangle = (options: Omit<Rectangle, "_tag">): Rectangle => ({ ...options, _tag: "Rectangle" })

/**
 * Creates an ellipse.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const ellipse = (options: Omit<Ellipse, "_tag">): Ellipse => ({ ...options, _tag: "Ellipse" })

/**
 * Creates a straight line.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const line = (options: Omit<Line, "_tag">): Line => ({ ...options, _tag: "Line" })

/**
 * Creates a line through a list of points.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const path = (
  points: ReadonlyArray<readonly [x: number, y: number]>,
  options?: Omit<Path, "_tag" | "points">
): Path => ({ ...options, _tag: "Path", points })

/**
 * Creates an image from JPEG or PNG data.
 *
 * **Details**
 *
 * The data is checked when the document is encoded.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const image = (data: Uint8Array, options: Omit<Image, "_tag" | "data">): Image => ({
  ...options,
  _tag: "Image",
  data
})

/**
 * Creates an area that opens `url` when clicked.
 *
 * **Details**
 *
 * The area is invisible: place text or shapes under it to show the link.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.2
 */
export const link = (url: string, options: Omit<Link, "_tag" | "url">): Link => ({ ...options, _tag: "Link", url })

/**
 * Measures the width of text in points.
 *
 * **Details**
 *
 * Text with several lines measures as its widest line. Characters that the
 * standard fonts do not have, which `encode` rejects, measure as zero.
 *
 * @see {@link layoutText} for measuring wrapped text
 *
 * @stability experimental
 * @category measuring
 * @since 4.1.2
 */
export const measureText = (text: string, style?: TextStyle): number => {
  const widths = metricsOf(style?.font).widths
  const size = style?.size ?? DEFAULT_SIZE
  let max = 0
  for (const line of text.split(LINE_BREAK)) max = Math.max(max, lineWidth(line, widths))
  return max * size / 1000
}

/**
 * Breaks text into lines as `text` content would, and measures the block.
 *
 * **Details**
 *
 * `width` of the result is the widest line and `height` is the number of
 * lines times `size * lineHeight`. Use it to size boxes around text or to
 * find where the next item goes.
 *
 * **Example** (Wrapping text to a width)
 *
 * ```ts import.meta.vitest
 * import { Pdf } from "effect/encoding"
 *
 * const layout = Pdf.layoutText("The quick brown fox jumps over the lazy dog", {
 *   size: 10,
 *   width: 100
 * })
 * layout.lines // => ["The quick brown fox", "jumps over the lazy", "dog"]
 * layout.height // => 36
 * ```
 *
 * @stability experimental
 * @category measuring
 * @since 4.1.2
 */
export const layoutText = (
  text: string,
  options?: TextStyle & { readonly width?: number | undefined }
): TextLayout => {
  const { widths } = metricsOf(options?.font)
  const size = options?.size ?? DEFAULT_SIZE
  const lines = breakLines(text, widths, options?.width === undefined ? undefined : options.width * 1000 / size)
  let max = 0
  for (const line of lines) max = Math.max(max, lineWidth(line, widths))
  return {
    lines,
    width: max * size / 1000,
    height: lines.length * size * (options?.lineHeight ?? DEFAULT_LINE_HEIGHT)
  }
}

/**
 * Encodes a document into PDF bytes.
 *
 * **Details**
 *
 * Every value is checked before anything is written, and the first invalid
 * one fails the effect with a `PdfError`. Fonts and images used on several
 * pages are written once. Document properties that are not ASCII are written
 * as UTF-16, so they can hold any character.
 *
 * **Gotchas**
 *
 * - Compression needs `CompressionStream("deflate")`. On a runtime without
 *   it, encoding with `compress` dies with the runtime's error: check for the
 *   API or pass `compress: false`.
 * - Link URLs must be ASCII: percent-encode other characters first.
 *
 * **Example** (Writing a one-page document)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { Pdf } from "effect/encoding"
 *
 * const document: Pdf.Document = {
 *   info: { title: "Invoice 42" },
 *   pages: [
 *     Pdf.page([
 *       Pdf.text("Invoice 42", { x: 72, y: 72, font: "Helvetica-Bold", size: 24 }),
 *       Pdf.line({ x1: 72, y1: 110, x2: 523, y2: 110, color: "#cccccc" }),
 *       Pdf.text("Thank you for your business.", { x: 72, y: 120 })
 *     ])
 *   ]
 * }
 *
 * const bytes = await Effect.runPromise(Pdf.encode(document))
 * new TextDecoder().decode(bytes.subarray(0, 8)) // => "%PDF-1.4"
 * ```
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.2
 */
export const encode = (document: Document, options?: EncodeOptions): Effect.Effect<Uint8Array, PdfError> =>
  Effect.suspend(() => {
    let built: Built
    try {
      built = build(document)
    } catch (error) {
      return isPdfError(error) ? Effect.fail(error) : Effect.die(error)
    }
    if (options?.compress === false) return Effect.succeed(serialize(built.objects, built.info))
    return Effect.map(Effect.promise(() => compressAll(built.objects)), (objects) => serialize(objects, built.info))
  })

// -----------------------------------------------------------------------------
// text
// -----------------------------------------------------------------------------

const DEFAULT_FONT: StandardFont = "Helvetica"
const DEFAULT_SIZE = 12
const DEFAULT_LINE_HEIGHT = 1.2
const LINE_BREAK = /\r\n|\r|\n/

const metricsOf = (font: StandardFont | undefined) => metrics[font ?? DEFAULT_FONT]

// Unicode code points of the WinAnsiEncoding codes 0x80 to 0x9f; codes 0x20
// to 0x7e and 0xa0 to 0xff are the same as their code points
const winAnsiHigh = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
])

const winAnsiCode = (codePoint: number): number | undefined =>
  (codePoint >= 0x20 && codePoint < 0x7f) || (codePoint >= 0xa0 && codePoint <= 0xff)
    ? codePoint
    : winAnsiHigh.get(codePoint)

// Width in thousandths of the font size
const charWidth = (char: string, widths: ReadonlyArray<number>): number => {
  const code = winAnsiCode(char.codePointAt(0)!)
  return code === undefined ? 0 : widths[code - 32]
}

const lineWidth = (line: string, widths: ReadonlyArray<number>): number => {
  let width = 0
  for (const char of line) width += charWidth(char, widths)
  return width
}

// Breaks text at line breaks and, when `max` is set, between words so that
// each line is at most `max` thousandths of the font size wide
const breakLines = (text: string, widths: ReadonlyArray<number>, max: number | undefined): Array<string> => {
  const lines: Array<string> = []
  for (const paragraph of text.split(LINE_BREAK)) {
    if (max === undefined) {
      lines.push(paragraph)
      continue
    }
    const limit = max + 1e-9
    const space = charWidth(" ", widths)
    // The line being filled, or `undefined` before its first word
    let line: string | undefined
    let width = 0
    // Spaces that end up at the start of a wrapped line are dropped
    let wrapped = false
    for (const word of paragraph.split(" ")) {
      const wordWidth = lineWidth(word, widths)
      if (line !== undefined) {
        if (width + space + wordWidth <= limit) {
          line += " " + word
          width += space + wordWidth
          continue
        }
        if (wordWidth <= limit) {
          lines.push(trimSpaces(line))
          line = undefined
          wrapped = true
        } else {
          // A word wider than a line starts on the current one
          line += " "
          width += space
        }
      }
      if (line === undefined) {
        if (wrapped && word === "") continue
        if (wordWidth <= limit) {
          line = word
          width = wordWidth
          continue
        }
        line = ""
        width = 0
      }
      // A word wider than a line is broken between characters
      for (const char of word) {
        const w = charWidth(char, widths)
        if (width + w > limit && trimSpaces(line) !== "") {
          lines.push(trimSpaces(line))
          line = ""
          width = 0
        }
        line += char
        width += w
      }
      wrapped = true
    }
    if (line !== undefined) lines.push(trimSpaces(line))
  }
  return lines
}

const trimSpaces = (line: string): string => line.replace(/ +$/, "")

// -----------------------------------------------------------------------------
// building
// -----------------------------------------------------------------------------

interface PdfObject {
  // Entries of the object's dictionary
  dict: string
  stream?: Uint8Array | undefined
  // Whether `stream` should be compressed; streams that are already compressed
  // carry their own `/Filter`
  compress?: boolean | undefined
}

interface ImageResource {
  readonly name: string
  readonly width: number
  readonly height: number
}

const CATALOG = 1
const PAGES = 2
const RESOURCES = 3

const encoder = new TextEncoder()

interface Built {
  readonly objects: Array<PdfObject>
  // Object number of the document properties
  readonly info: number | undefined
}

const build = (document: Document): Built => {
  if (document.pages.length === 0) throw invalidContent("a document needs at least one page")
  const objects: Array<PdfObject> = []
  // Object numbers start at 1
  const add = (object: PdfObject): number => objects.push(object)
  const reserve = (): number => objects.push({ dict: "" })

  add({ dict: `/Type /Catalog /Pages ${PAGES} 0 R` })
  reserve()
  reserve()
  const info = document.info === undefined ? undefined : add({ dict: infoDict(document.info) })

  const fonts = new Map<StandardFont, string>()
  const fontName = (font: StandardFont): string => {
    let name = fonts.get(font)
    if (name === undefined) {
      if (!Object.hasOwn(metrics, font)) throw invalidContent(`unknown font ${JSON.stringify(font)}`)
      name = `F${fonts.size + 1}`
      fonts.set(font, name)
    }
    return name
  }
  const images = new Map<Uint8Array, ImageResource>()
  const imageObjects: Array<string> = []
  const imageResource = (data: Uint8Array): ImageResource => {
    let resource = images.get(data)
    if (resource === undefined) {
      const decoded = readImage(data)
      let dict = decoded.dict
      if (decoded.mask !== undefined) dict += ` /SMask ${add(decoded.mask)} 0 R`
      const name = `Im${images.size + 1}`
      imageObjects.push(`/${name} ${add({ dict, stream: decoded.stream, compress: decoded.compress })} 0 R`)
      resource = { name, width: decoded.width, height: decoded.height }
      images.set(data, resource)
    }
    return resource
  }

  const kids: Array<string> = []
  for (const page of document.pages) {
    const { height, width } = page.size
    positive("page width", width)
    positive("page height", height)
    const ops: Array<string> = []
    const annotations: Array<string> = []
    for (const content of page.content) {
      switch (content._tag) {
        case "Text": {
          writeText(ops, content, height, fontName)
          break
        }
        case "Rectangle": {
          const w = nonNegative("rectangle width", content.width)
          const h = nonNegative("rectangle height", content.height)
          ops.push(
            `q ${shapeStyle(content)}${num(content.x)} ${num(height - content.y - h)} ${num(w)} ${num(h)} re ${
              paintOp(content)
            } Q`
          )
          break
        }
        case "Ellipse": {
          const rx = nonNegative("ellipse width", content.width) / 2
          const ry = nonNegative("ellipse height", content.height) / 2
          const cx = finite("x", content.x) + rx
          const cy = height - finite("y", content.y) - ry
          const kx = rx * KAPPA
          const ky = ry * KAPPA
          const c = (...points: ReadonlyArray<number>) => `${points.map(num).join(" ")} c`
          ops.push(
            `q ${shapeStyle(content)}${num(cx + rx)} ${num(cy)} m ${
              c(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry)
            } ${c(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy)} ${
              c(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry)
            } ${c(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy)} h ${paintOp(content)} Q`
          )
          break
        }
        case "Line": {
          let style = `${color(content.color ?? "#000")} RG ${num(lineWidthOf(content.lineWidth))} w `
          if (content.dash !== undefined) style += `${dashPattern(content.dash)} 0 d `
          ops.push(
            `q ${style}${num(content.x1)} ${num(height - content.y1)} m ${num(content.x2)} ${
              num(height - content.y2)
            } l S Q`
          )
          break
        }
        case "Path": {
          if (content.points.length < 2) throw invalidContent("a path needs at least two points")
          const segments = content.points.map(([x, y], i) => `${num(x)} ${num(height - y)} ${i === 0 ? "m" : "l"}`)
          if (content.closed === true) segments.push("h")
          ops.push(`q ${shapeStyle(content)}${segments.join(" ")} ${paintOp(content)} Q`)
          break
        }
        case "Image": {
          const resource = imageResource(content.data)
          const w = nonNegative(
            "image width",
            content.width ??
              (content.height === undefined ? resource.width : content.height * resource.width / resource.height)
          )
          const h = nonNegative("image height", content.height ?? w * resource.height / resource.width)
          ops.push(
            `q ${num(w)} 0 0 ${num(h)} ${num(content.x)} ${num(height - content.y - h)} cm /${resource.name} Do Q`
          )
          break
        }
        case "Link": {
          const w = nonNegative("link width", content.width)
          const h = nonNegative("link height", content.height)
          const x = finite("x", content.x)
          const top = height - finite("y", content.y)
          if (!/^[\x20-\x7e]*$/.test(content.url)) {
            throw invalidContent(`link URL ${JSON.stringify(content.url)} is not ASCII`)
          }
          annotations.push(
            `${
              add({
                dict: `/Type /Annot /Subtype /Link /Rect [${num(x)} ${num(top - h)} ${num(x + w)} ${
                  num(top)
                }] /Border [0 0 0] /A << /S /URI /URI ${asciiString(content.url)} >>`
              })
            } 0 R`
          )
          break
        }
        default: {
          throw invalidContent(`unknown content ${JSON.stringify((content as { _tag: unknown })._tag)}`)
        }
      }
    }
    const contents = add({ dict: "", stream: encoder.encode(ops.join("\n")), compress: true })
    let dict = `/Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 ${num(width)} ${
      num(height)
    }] /Resources ${RESOURCES} 0 R /Contents ${contents} 0 R`
    if (annotations.length > 0) dict += ` /Annots [${annotations.join(" ")}]`
    kids.push(`${add({ dict })} 0 R`)
  }

  const fontObjects: Array<string> = []
  for (const [font, name] of fonts) {
    fontObjects.push(
      `/${name} ${add({ dict: `/Type /Font /Subtype /Type1 /BaseFont /${font} /Encoding /WinAnsiEncoding` })} 0 R`
    )
  }
  objects[PAGES - 1] = { dict: `/Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length}` }
  let resources = ""
  if (fontObjects.length > 0) resources += `/Font << ${fontObjects.join(" ")} >>`
  if (imageObjects.length > 0) resources += `${resources === "" ? "" : " "}/XObject << ${imageObjects.join(" ")} >>`
  objects[RESOURCES - 1] = { dict: resources }
  return { objects, info }
}

// Distance of the Bézier control points that approximate a quarter circle
const KAPPA = 0.5522847498307936

const writeText = (
  ops: Array<string>,
  content: Text,
  pageHeight: number,
  fontName: (font: StandardFont) => string
): void => {
  const font = content.font ?? DEFAULT_FONT
  const name = fontName(font)
  const { ascender, descender, widths } = metrics[font]
  const size = positive("font size", content.size ?? DEFAULT_SIZE)
  const advance = size * positive("line height", content.lineHeight ?? DEFAULT_LINE_HEIGHT)
  const x = finite("x", content.x)
  const y = finite("y", content.y)
  const box = content.width === undefined ? undefined : positive("text width", content.width)
  const align = content.align ?? "left"
  // Half of the space between lines goes above the glyphs, as in CSS
  const first = y + (advance - (ascender - descender) * size / 1000) / 2 + ascender * size / 1000
  const lines = breakLines(content.text, widths, box === undefined ? undefined : box * 1000 / size)
  const out = [`BT /${name} ${num(size)} Tf ${color(content.color ?? "#000")} rg`]
  lines.forEach((line, i) => {
    if (line === "") return
    const codes = encodeText(line, font)
    const width = lineWidth(line, widths) * size / 1000
    const left = align === "left"
      ? x
      : align === "center"
      ? x + ((box ?? 0) - width) / 2
      : x + (box ?? 0) - width
    out.push(`1 0 0 1 ${num(left)} ${num(pageHeight - first - i * advance)} Tm ${literal(codes)} Tj`)
  })
  out.push("ET")
  ops.push(out.join("\n"))
}

const encodeText = (text: string, font: StandardFont): Array<number> => {
  const codes: Array<number> = []
  for (const char of text) {
    const codePoint = char.codePointAt(0)!
    const code = winAnsiCode(codePoint)
    if (code === undefined) {
      throw new PdfError({
        kind: "UnsupportedCharacter",
        message: `character ${JSON.stringify(char)} (U+${
          codePoint.toString(16).toUpperCase().padStart(4, "0")
        }) is not in the standard font ${font}`
      })
    }
    codes.push(code)
  }
  return codes
}

const literal = (codes: ReadonlyArray<number>): string => {
  let out = "("
  for (const code of codes) {
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += "\\" + String.fromCharCode(code)
    else if (code < 0x20 || code > 0x7e) out += "\\" + code.toString(8).padStart(3, "0")
    else out += String.fromCharCode(code)
  }
  return out + ")"
}

const asciiString = (text: string): string => literal(Array.from(text, (char) => char.charCodeAt(0)))

// A PDF text string: ASCII as a literal, anything else as UTF-16BE
const textString = (text: string): string => {
  if (/^[\x20-\x7e]*$/.test(text)) return asciiString(text)
  let hex = "<FEFF"
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")
  return hex + ">"
}

const infoDict = (info: Info): string => {
  const entries: Array<string> = []
  const entry = (key: string, value: string | undefined) => {
    if (value !== undefined) entries.push(`/${key} ${textString(value)}`)
  }
  entry("Title", info.title)
  entry("Author", info.author)
  entry("Subject", info.subject)
  entry("Keywords", info.keywords)
  entry("Creator", info.creator)
  entry("Producer", info.producer)
  if (info.creationDate !== undefined) {
    const date = info.creationDate
    if (Number.isNaN(date.getTime())) throw invalidContent("creation date is an invalid Date")
    const year = date.getUTCFullYear()
    if (year < 0 || year > 9999) throw invalidContent(`creation date ${date.toISOString()} is out of range`)
    const pad = (n: number, width = 2) => String(n).padStart(width, "0")
    entries.push(
      `/CreationDate (D:${pad(year, 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${
        pad(date.getUTCHours())
      }${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z)`
    )
  }
  return entries.join(" ")
}

// -----------------------------------------------------------------------------
// graphics
// -----------------------------------------------------------------------------

const num = (n: number): string => {
  if (!Number.isFinite(n)) throw invalidContent(`${n} is not a finite number`)
  const fixed = n.toFixed(3)
  const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed
  return trimmed === "-0" ? "0" : trimmed
}

const finite = (name: string, n: number): number => {
  if (typeof n !== "number" || !Number.isFinite(n)) throw invalidContent(`${name} must be a finite number, got ${n}`)
  return n
}

const nonNegative = (name: string, n: number): number => {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) {
    throw invalidContent(`${name} must be a finite number of at least 0, got ${n}`)
  }
  return n
}

const positive = (name: string, n: number): number => {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    throw invalidContent(`${name} must be a finite number greater than 0, got ${n}`)
  }
  return n
}

const color = (value: Color): string => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (match === null) throw invalidContent(`color ${JSON.stringify(value)} is not a #rgb or #rrggbb hex color`)
  const hex = match[1].length === 3 ? Array.from(match[1], (digit) => digit + digit).join("") : match[1]
  const components: Array<string> = []
  for (let i = 0; i < 6; i += 2) components.push(num(parseInt(hex.slice(i, i + 2), 16) / 255))
  return components.join(" ")
}

const lineWidthOf = (lineWidth: number | undefined): number => nonNegative("line width", lineWidth ?? 1)

const dashPattern = (dash: ReadonlyArray<number>): string => {
  for (const length of dash) nonNegative("dash length", length)
  if (dash.length > 0 && dash.every((length) => length === 0)) {
    throw invalidContent("a dash pattern needs a length greater than 0")
  }
  return `[${dash.map(num).join(" ")}]`
}

const shapeStyle = (style: ShapeStyle): string => {
  let out = ""
  if (style.fill !== undefined) out += `${color(style.fill)} rg `
  if (style.stroke !== undefined || style.fill === undefined) {
    out += `${color(style.stroke ?? "#000")} RG ${num(lineWidthOf(style.lineWidth))} w `
  }
  return out
}

const paintOp = (style: ShapeStyle): string => style.fill === undefined ? "S" : style.stroke === undefined ? "f" : "B"

// -----------------------------------------------------------------------------
// images
// -----------------------------------------------------------------------------

interface DecodedImage {
  readonly width: number
  readonly height: number
  readonly dict: string
  readonly stream: Uint8Array
  readonly compress: boolean
  readonly mask?: PdfObject | undefined
}

const readImage = (data: Uint8Array): DecodedImage => {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) return readJpeg(data)
  if (data.length >= 8 && PNG_SIGNATURE.every((byte, i) => data[i] === byte)) return readPng(data)
  throw invalidImage("image data is neither JPEG nor PNG")
}

const u16 = (data: Uint8Array, at: number): number => (data[at] << 8) | data[at + 1]

const u32 = (data: Uint8Array, at: number): number =>
  ((data[at] << 24) | (data[at + 1] << 16) | (data[at + 2] << 8) | data[at + 3]) >>> 0

const ascii = (data: Uint8Array, at: number, length: number): string =>
  String.fromCharCode(...data.subarray(at, at + length))

// Reads the frame header; the data itself is written as it is
const readJpeg = (data: Uint8Array): DecodedImage => {
  let at = 2
  let adobe = false
  while (at + 4 <= data.length) {
    if (data[at] !== 0xff) throw invalidImage(`malformed JPEG marker at byte ${at}`)
    const marker = data[at + 1]
    // Fill bytes, and markers without a length
    if (marker === 0xff) {
      at++
      continue
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2
      continue
    }
    if (marker === 0xd9 || marker === 0xda) break
    const length = u16(data, at + 2)
    if (length < 2 || at + 2 + length > data.length) break
    // Adobe writes CMYK JPEG data inverted, and marks it with an APP14 segment
    if (marker === 0xee && length >= 7 && ascii(data, at + 4, 5) === "Adobe") adobe = true
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 8) break
      const bits = data[at + 4]
      const height = u16(data, at + 5)
      const width = u16(data, at + 7)
      const components = data[at + 9]
      if (bits !== 8) throw unsupportedImage(`JPEG images with ${bits}-bit samples are not supported`)
      if (width === 0 || height === 0) {
        throw unsupportedImage("JPEG images without a height in the frame header are not supported")
      }
      const colorSpace = components === 1
        ? "/DeviceGray"
        : components === 3
        ? "/DeviceRGB"
        : components === 4
        ? "/DeviceCMYK"
        : undefined
      if (colorSpace === undefined) {
        throw unsupportedImage(`JPEG images with ${components} components are not supported`)
      }
      const decode = components === 4 && adobe ? " /Decode [1 0 1 0 1 0 1 0]" : ""
      return {
        width,
        height,
        dict:
          `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${colorSpace} /BitsPerComponent 8${decode} /Filter /DCTDecode`,
        stream: data,
        compress: false
      }
    }
    at += 2 + length
  }
  throw invalidImage("JPEG image has no frame header")
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// Valid bit depths for each PNG color type
const PNG_DEPTHS: Record<number, ReadonlyArray<number>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16]
}

// Samples per pixel of each PNG color type
const PNG_CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }

const readPng = (data: Uint8Array): DecodedImage => {
  let at = 8
  let header: { width: number; height: number; depth: number; colorType: number } | undefined
  let palette: Uint8Array | undefined
  let transparency: Uint8Array | undefined
  const idat: Array<Uint8Array> = []
  let idatLength = 0
  while (true) {
    if (at + 8 > data.length) throw invalidImage("PNG image is truncated")
    const length = u32(data, at)
    const type = ascii(data, at + 4, 4)
    const start = at + 8
    if (start + length + 4 > data.length) throw invalidImage("PNG image is truncated")
    const chunk = data.subarray(start, start + length)
    at = start + length + 4
    if (type === "IHDR") {
      if (length !== 13) throw invalidImage("PNG image has a malformed IHDR chunk")
      const width = u32(chunk, 0)
      const height = u32(chunk, 4)
      const depth = chunk[8]
      const colorType = chunk[9]
      if (width === 0 || height === 0) throw invalidImage("PNG image has no pixels")
      if (!(PNG_DEPTHS[colorType]?.includes(depth) ?? false)) {
        throw invalidImage(`PNG image has an invalid color type ${colorType} with bit depth ${depth}`)
      }
      if (chunk[10] !== 0 || chunk[11] !== 0) {
        throw invalidImage("PNG image has an unknown compression or filter method")
      }
      if (chunk[12] !== 0) throw unsupportedImage("interlaced PNG images are not supported")
      header = { width, height, depth, colorType }
    } else if (header === undefined) {
      throw invalidImage("PNG image does not start with an IHDR chunk")
    } else if (type === "PLTE") {
      if (length === 0 || length % 3 !== 0 || length > 768) throw invalidImage("PNG image has a malformed palette")
      palette = chunk
    } else if (type === "tRNS") {
      transparency = chunk
    } else if (type === "IDAT") {
      idat.push(chunk)
      idatLength += length
    } else if (type === "IEND") {
      break
    }
  }
  if (header === undefined) throw invalidImage("PNG image does not start with an IHDR chunk")
  const { colorType, depth, height, width } = header
  if (idatLength === 0) throw invalidImage("PNG image has no image data")
  const compressed = new Uint8Array(idatLength)
  let offset = 0
  for (const chunk of idat) {
    compressed.set(chunk, offset)
    offset += chunk.length
  }

  let colorSpace: string
  if (colorType === 3) {
    if (palette === undefined) throw invalidImage("PNG image has no palette")
    let hex = ""
    for (const byte of palette) hex += byte.toString(16).padStart(2, "0")
    colorSpace = `[/Indexed /DeviceRGB ${palette.length / 3 - 1} <${hex}>]`
  } else {
    colorSpace = colorType === 0 || colorType === 4 ? "/DeviceGray" : "/DeviceRGB"
  }
  const imageDict = `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${colorSpace}`
  const hasAlpha = colorType === 4 || colorType === 6 || (colorType === 3 && transparency !== undefined)

  if (!hasAlpha) {
    // The zlib stream and the row filters of PNG are both readable by PDF, so
    // the data is written as it is
    const colors = colorType === 2 ? 3 : 1
    let mask = ""
    if (transparency !== undefined) {
      // A transparent color, as one sample value per channel
      if (transparency.length < colors * 2) throw invalidImage("PNG image has a malformed tRNS chunk")
      const samples: Array<number> = []
      for (let i = 0; i < colors; i++) samples.push(u16(transparency, i * 2), u16(transparency, i * 2))
      mask = ` /Mask [${samples.join(" ")}]`
    }
    return {
      width,
      height,
      dict:
        `${imageDict} /BitsPerComponent ${depth}${mask} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${depth} /Columns ${width} >>`,
      stream: compressed,
      compress: false
    }
  }

  // Alpha has to be moved into a soft mask, so the pixels are decoded
  const channels = PNG_CHANNELS[colorType]
  const rowBytes = Math.ceil(width * channels * depth / 8)
  const pixels = unfilter(
    inflatePng(compressed, height * (rowBytes + 1)),
    height,
    rowBytes,
    Math.max(1, channels * depth / 8)
  )
  const alpha = new Uint8Array(width * height * (colorType === 3 ? 1 : depth / 8))
  let color: Uint8Array
  if (colorType === 3) {
    color = pixels
    const mask = (1 << depth) - 1
    let i = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = x * depth
        const index = (pixels[y * rowBytes + (bit >> 3)] >> (8 - depth - (bit & 7))) & mask
        alpha[i++] = index < transparency!.length ? transparency![index] : 255
      }
    }
  } else {
    // Gray or RGB samples followed by an alpha sample, each `depth / 8` bytes
    const sampleBytes = depth / 8
    const colorBytes = (channels - 1) * sampleBytes
    color = new Uint8Array(width * height * colorBytes)
    let c = 0
    let a = 0
    for (let p = 0; p < pixels.length;) {
      for (let i = 0; i < colorBytes; i++) color[c++] = pixels[p++]
      for (let i = 0; i < sampleBytes; i++) alpha[a++] = pixels[p++]
    }
  }
  return {
    width,
    height,
    dict: `${imageDict} /BitsPerComponent ${depth}`,
    stream: color,
    compress: true,
    mask: {
      dict:
        `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent ${
          colorType === 3 ? 8 : depth
        }`,
      stream: alpha,
      compress: true
    }
  }
}

const inflatePng = (data: Uint8Array, expected: number): Uint8Array => {
  if (data.length < 2 || (data[0] & 0x0f) !== 8 || u16(data, 0) % 31 !== 0 || (data[1] & 0x20) !== 0) {
    throw invalidImage("PNG image data is not a zlib stream")
  }
  const queue = new ByteQueue()
  queue.push(data.subarray(2))
  const inflater = new Inflater(queue, new InflateMemory())
  const out = new Uint8Array(expected)
  let length = 0
  try {
    while (true) {
      const chunk = inflater.pull()
      if (chunk === undefined) break
      if (chunk === NeedInput) throw invalidImage("PNG image data is truncated")
      if (length + chunk.length > expected) throw invalidImage("PNG image data is longer than its dimensions need")
      out.set(chunk, length)
      length += chunk.length
    }
  } catch (error) {
    if (error instanceof InflateError) throw invalidImage(`PNG image data is corrupt: ${error.message}`)
    throw error
  }
  if (length < expected) throw invalidImage("PNG image data is shorter than its dimensions need")
  return out
}

// Reverses the PNG row filters
const unfilter = (data: Uint8Array, height: number, rowBytes: number, bpp: number): Uint8Array => {
  const out = new Uint8Array(height * rowBytes)
  for (let y = 0; y < height; y++) {
    const filter = data[y * (rowBytes + 1)]
    const src = y * (rowBytes + 1) + 1
    const row = y * rowBytes
    const prev = row - rowBytes
    for (let i = 0; i < rowBytes; i++) {
      const raw = data[src + i]
      const left = i >= bpp ? out[row + i - bpp] : 0
      const up = y > 0 ? out[prev + i] : 0
      const upLeft = y > 0 && i >= bpp ? out[prev + i - bpp] : 0
      let value: number
      switch (filter) {
        case 0:
          value = raw
          break
        case 1:
          value = raw + left
          break
        case 2:
          value = raw + up
          break
        case 3:
          value = raw + ((left + up) >> 1)
          break
        case 4: {
          const p = left + up - upLeft
          const pa = Math.abs(p - left)
          const pb = Math.abs(p - up)
          const pc = Math.abs(p - upLeft)
          value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)
          break
        }
        default:
          throw invalidImage(`PNG image has an unknown row filter ${filter}`)
      }
      out[row + i] = value & 0xff
    }
  }
  return out
}

// -----------------------------------------------------------------------------
// output
// -----------------------------------------------------------------------------

// Compressor failures, including a runtime without `deflate`, are defects
const compressAll = (objects: ReadonlyArray<PdfObject>): Promise<Array<PdfObject>> =>
  Promise.all(objects.map(async (object) =>
    object.compress === true && object.stream !== undefined
      ? {
        dict: `${object.dict}${object.dict === "" ? "" : " "}/Filter /FlateDecode`,
        stream: await deflate(object.stream)
      }
      : object
  ))

const deflate = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const compressor = new CompressionStream("deflate")
  const writer = compressor.writable.getWriter()
  // A failed write errors the readable, so the reads report it
  if (bytes.length > 0) {
    // CompressionStream rejects views of a SharedArrayBuffer
    writer.write(bytes.buffer instanceof ArrayBuffer ? bytes as Uint8Array<ArrayBuffer> : bytes.slice()).catch(
      () => {}
    )
  }
  writer.close().catch(() => {})
  const reader = compressor.readable.getReader()
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

// The binary comment tells transfer tools that the file is not text
const HEADER = new Uint8Array([...encoder.encode("%PDF-1.4\n%"), 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])

const serialize = (objects: ReadonlyArray<PdfObject>, info: number | undefined): Uint8Array => {
  const chunks: Array<Uint8Array> = [HEADER]
  let length = HEADER.length
  const push = (chunk: Uint8Array) => {
    chunks.push(chunk)
    length += chunk.length
  }
  const offsets: Array<number> = []
  objects.forEach((object, i) => {
    offsets.push(length)
    if (object.stream === undefined) {
      push(encoder.encode(`${i + 1} 0 obj\n<< ${object.dict} >>\nendobj\n`))
      return
    }
    push(
      encoder.encode(
        `${i + 1} 0 obj\n<< ${object.dict}${object.dict === "" ? "" : " "}/Length ${object.stream.length} >>\nstream\n`
      )
    )
    push(object.stream)
    push(encoder.encode("\nendstream\nendobj\n"))
  })
  const xref = length
  let trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) trailer += `${String(offset).padStart(10, "0")} 00000 n \n`
  trailer += `trailer\n<< /Size ${objects.length + 1} /Root ${CATALOG} 0 R${
    info === undefined ? "" : ` /Info ${info} 0 R`
  } >>\nstartxref\n${xref}\n%%EOF\n`
  push(encoder.encode(trailer))
  return concat(chunks, length)
}

const invalidContent = (message: string) => new PdfError({ kind: "InvalidContent", message })

const invalidImage = (message: string) => new PdfError({ kind: "InvalidImage", message })

const unsupportedImage = (message: string) => new PdfError({ kind: "UnsupportedImage", message })
