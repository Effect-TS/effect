import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Pdf from "effect/encoding/Pdf"
import { deflateSync, inflateSync } from "node:zlib"

const latin1 = new TextDecoder("latin1")

interface PdfObject {
  readonly dict: string
  readonly stream: Uint8Array | undefined
}

// Reads every object through the cross-reference table, so that a wrong
// offset fails the read
const parse = (bytes: Uint8Array) => {
  const text = latin1.decode(bytes)
  assert.isTrue(text.startsWith("%PDF-1.4\n"))
  assert.isTrue(text.endsWith("%%EOF\n"))
  const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)![1])
  const xref = /^xref\n0 (\d+)\n/.exec(text.slice(startxref))!
  const count = Number(xref[1])
  const objects = new Map<number, PdfObject>()
  for (let n = 1; n < count; n++) {
    const entry = startxref + xref[0].length + n * 20
    const offset = Number(text.slice(entry, entry + 10))
    const header = `${n} 0 obj\n<< `
    assert.strictEqual(text.slice(offset, offset + header.length), header)
    const start = offset + header.length
    const end = text.indexOf(" >>\nendobj\n", start)
    const streamEnd = text.indexOf(" >>\nstream\n", start)
    if (streamEnd !== -1 && (end === -1 || streamEnd < end)) {
      const dict = text.slice(start, streamEnd)
      const length = Number(/\/Length (\d+)$/.exec(dict)![1])
      const data = streamEnd + " >>\nstream\n".length
      assert.strictEqual(text.slice(data + length, data + length + 11), "\nendstream\n")
      objects.set(n, { dict, stream: bytes.subarray(data, data + length) })
    } else {
      objects.set(n, { dict: text.slice(start, end), stream: undefined })
    }
  }
  const trailer = /trailer\n<< (.*) >>\n/.exec(text)![1]
  return { objects, trailer }
}

const ref = (dict: string, key: string) => Number(new RegExp(`/${key} (\\d+) 0 R`).exec(dict)![1])

const pageContents = (bytes: Uint8Array): Array<string> => {
  const { objects } = parse(bytes)
  return Array.from(objects.values())
    .filter((object) => object.dict.startsWith("/Type /Page "))
    .map((page) => {
      const contents = objects.get(ref(page.dict, "Contents"))!
      const stream = contents.dict.includes("/FlateDecode") ? inflateSync(contents.stream!) : contents.stream!
      return latin1.decode(stream)
    })
}

const encodeRaw = (pages: ReadonlyArray<Pdf.Page>, info?: Pdf.Info) => Pdf.encode({ pages, info }, { compress: false })

const failure = <A>(effect: Effect.Effect<A, Pdf.PdfError>) => Effect.map(Effect.flip(effect), (error) => error.kind)

const pngChunk = (type: string, data: Uint8Array) => {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, "ascii")
  out.set(data, 8)
  // The CRC is not checked
  return out
}

const png = (
  options: { width: number; height: number; colorType: number; interlace?: number },
  rows: ReadonlyArray<ReadonlyArray<number>>,
  extra: ReadonlyArray<Buffer> = []
) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(options.width, 0)
  ihdr.writeUInt32BE(options.height, 4)
  ihdr[8] = 8
  ihdr[9] = options.colorType
  ihdr[12] = options.interlace ?? 0
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    ...extra,
    pngChunk("IDAT", deflateSync(Buffer.from(rows.flat()))),
    pngChunk("IEND", new Uint8Array(0))
  ]))
}

describe("Pdf", () => {
  it.effect("writes pages, fonts and document properties", () =>
    Effect.gen(function*() {
      const bytes = yield* encodeRaw([
        Pdf.page([
          Pdf.text("Hello (world)", { x: 72, y: 72 }),
          Pdf.text("€é“\\", { x: 72, y: 100, font: "Times-Bold", size: 10 })
        ]),
        Pdf.page([Pdf.text("Again", { x: 0, y: 0 })], { size: Pdf.landscape(Pdf.Letter) })
      ], { title: "Café", author: "Ada", creationDate: new Date("2026-10-31T12:34:56Z") })
      const { objects, trailer } = parse(bytes)

      const catalog = objects.get(ref(trailer, "Root"))!
      const pages = objects.get(ref(catalog.dict, "Pages"))!
      assert.match(pages.dict, /\/Count 2$/)
      const info = objects.get(ref(trailer, "Info"))!
      assert.strictEqual(
        info.dict,
        "/Title <FEFF00430061006600E9> /Author (Ada) /CreationDate (D:20261031123456Z)"
      )
      const fonts = Array.from(objects.values()).filter((object) => object.dict.startsWith("/Type /Font"))
      assert.deepStrictEqual(fonts.map((font) => font.dict), [
        "/Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding",
        "/Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding"
      ])
      const pageDicts = Array.from(objects.values()).filter((object) => object.dict.startsWith("/Type /Page "))
      assert.include(pageDicts[1].dict, "/MediaBox [0 0 792 612]")

      // The first baseline is 1.65 + 8.616 points below the top of the text,
      // and y is flipped against the A4 height of 841.89
      assert.deepStrictEqual(pageContents(bytes)[0].split("\n"), [
        "BT /F1 12 Tf 0 0 0 rg",
        "1 0 0 1 72 759.624 Tm (Hello \\(world\\)) Tj",
        "ET",
        "BT /F2 10 Tf 0 0 0 rg",
        "1 0 0 1 72 733.56 Tm (\\200\\351\\223\\\\) Tj",
        "ET"
      ])
    }))

  it.effect("compresses page content", () =>
    Effect.gen(function*() {
      const document = { pages: [Pdf.page([Pdf.rectangle({ x: 10, y: 10, width: 20, height: 5, fill: "#f00" })])] }
      const compressed = yield* Pdf.encode(document)
      const raw = yield* Pdf.encode(document, { compress: false })
      assert.include(latin1.decode(compressed), "/Filter /FlateDecode")
      assert.deepStrictEqual(pageContents(compressed), pageContents(raw))
      assert.deepStrictEqual(pageContents(raw), ["q 1 0 0 rg 10 826.89 20 5 re f Q"])
    }))

  it.effect("draws shapes and links", () =>
    Effect.gen(function*() {
      const bytes = yield* encodeRaw([
        Pdf.page([
          Pdf.line({ x1: 0, y1: 10, x2: 50, y2: 10, dash: [3, 1], lineWidth: 0.5 }),
          Pdf.path([[0, 0], [10, 20], [20, 0]], { closed: true, fill: "#00ff00", stroke: "#000" }),
          Pdf.ellipse({ x: 0, y: 0, width: 20, height: 10 }),
          Pdf.link("https://effect.website/(docs)", { x: 10, y: 20, width: 30, height: 10 })
        ], { size: { width: 100, height: 100 } })
      ])
      assert.deepStrictEqual(pageContents(bytes)[0].split("\n"), [
        "q 0 0 0 RG 0.5 w [3 1] 0 d 0 90 m 50 90 l S Q",
        "q 0 1 0 rg 0 0 0 RG 1 w 0 100 m 10 80 l 20 100 l h B Q",
        "q 0 0 0 RG 1 w 20 95 m 20 97.761 15.523 100 10 100 c 4.477 100 0 97.761 0 95 c " +
        "0 92.239 4.477 90 10 90 c 15.523 90 20 92.239 20 95 c h S Q"
      ])
      const { objects } = parse(bytes)
      const annotation = Array.from(objects.values()).find((object) => object.dict.startsWith("/Type /Annot"))!
      assert.strictEqual(
        annotation.dict,
        "/Type /Annot /Subtype /Link /Rect [10 70 40 80] /Border [0 0 0] /A << /S /URI /URI (https://effect.website/\\(docs\\)) >>"
      )
    }))

  it.effect("aligns and wraps text within a width", () =>
    Effect.gen(function*() {
      const bytes = yield* encodeRaw([
        Pdf.page([
          Pdf.text("AA AA", { x: 10, y: 0, width: 20, align: "right", font: "Courier", size: 10, lineHeight: 1 }),
          Pdf.text("A", { x: 50, y: 0, align: "center", font: "Courier", size: 10, lineHeight: 1 })
        ], { size: { width: 100, height: 100 } })
      ])
      // Courier glyphs are 6 points wide at size 10
      assert.deepStrictEqual(pageContents(bytes)[0].split("\n"), [
        "BT /F1 10 Tf 0 0 0 rg",
        "1 0 0 1 18 92.64 Tm (AA) Tj",
        "1 0 0 1 18 82.64 Tm (AA) Tj",
        "ET",
        "BT /F1 10 Tf 0 0 0 rg",
        "1 0 0 1 47 92.64 Tm (A) Tj",
        "ET"
      ])
    }))

  it("measures and lays out text", () => {
    // Helvetica widths of H, e, l, l, o: 722 + 556 + 222 + 222 + 556
    assert.closeTo(Pdf.measureText("Hello"), 27.336, 1e-9)
    assert.closeTo(Pdf.measureText("ab\nabcd", { font: "Courier", size: 10 }), 24, 1e-9)
    assert.deepStrictEqual(
      Pdf.layoutText("  indented  words\nabcdefgh", { font: "Courier", size: 10, width: 30, lineHeight: 1 }),
      { lines: ["  ind", "ented", "words", "abcde", "fgh"], width: 30, height: 50 }
    )
  })

  it.effect("embeds images once", () =>
    Effect.gen(function*() {
      // A JPEG frame header for a 3 × 2 RGB image; the data is not decoded
      const jpeg = new Uint8Array([
        0xff,
        0xd8,
        0xff,
        0xc0,
        0,
        17,
        8,
        0,
        2,
        0,
        3,
        3,
        ...new Array(9).fill(0),
        0xff,
        0xd9
      ])
      const rgb = png({ width: 1, height: 1, colorType: 2 }, [[0, 1, 2, 3]])
      const bytes = yield* encodeRaw([
        Pdf.page([Pdf.image(jpeg, { x: 0, y: 0, width: 30 }), Pdf.image(rgb, { x: 0, y: 50 })], {
          size: { width: 100, height: 100 }
        }),
        Pdf.page([Pdf.image(jpeg, { x: 0, y: 0, height: 10 })], { size: { width: 100, height: 100 } })
      ])
      assert.deepStrictEqual(pageContents(bytes), [
        "q 30 0 0 20 0 80 cm /Im1 Do Q\nq 1 0 0 1 0 49 cm /Im2 Do Q",
        "q 15 0 0 10 0 90 cm /Im1 Do Q"
      ])
      const images = Array.from(parse(bytes).objects.values()).filter((object) => object.dict.includes("/Image"))
      assert.deepStrictEqual(images.map((image) => image.dict.replace(/ \/Length \d+$/, "")), [
        "/Type /XObject /Subtype /Image /Width 3 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode",
        "/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns 1 >>"
      ])
      assert.deepStrictEqual(images[0].stream, jpeg)
    }))

  it.effect("moves PNG alpha into a soft mask", () =>
    Effect.gen(function*() {
      // Two RGBA pixels per row; the second row uses the Sub filter
      const rgba = png({ width: 2, height: 2, colorType: 6 }, [
        [0, 10, 20, 30, 255, 40, 50, 60, 0],
        [1, 1, 2, 3, 128, 1, 1, 1, 1]
      ])
      const palette = png({ width: 2, height: 1, colorType: 3 }, [[0, 0, 1]], [
        pngChunk("PLTE", new Uint8Array([255, 0, 0, 0, 0, 255])),
        pngChunk("tRNS", new Uint8Array([64]))
      ])
      const bytes = yield* encodeRaw([Pdf.page([Pdf.image(rgba, { x: 0, y: 0 }), Pdf.image(palette, { x: 0, y: 0 })])])
      const { objects } = parse(bytes)
      const images = Array.from(objects.values()).filter((object) => object.dict.includes("/SMask"))
      const read = (image: PdfObject) => ({
        color: Array.from(image.stream!),
        alpha: Array.from(objects.get(ref(image.dict, "SMask"))!.stream!)
      })
      assert.deepStrictEqual(read(images[0]), {
        color: [10, 20, 30, 40, 50, 60, 1, 2, 3, 2, 3, 4],
        alpha: [255, 0, 128, 129]
      })
      assert.deepStrictEqual(read(images[1]), { color: [0, 1], alpha: [64, 255] })
      assert.include(images[1].dict, "/ColorSpace [/Indexed /DeviceRGB 1 <ff00000000ff>]")
    }))

  it.effect("rejects content it cannot write", () =>
    Effect.gen(function*() {
      const encode = (content: Pdf.Content) => failure(encodeRaw([Pdf.page([content])]))
      assert.strictEqual(yield* failure(encodeRaw([])), "InvalidContent")
      assert.strictEqual(yield* encode(Pdf.text("日本", { x: 0, y: 0 })), "UnsupportedCharacter")
      assert.strictEqual(yield* encode(Pdf.text("a\tb", { x: 0, y: 0 })), "UnsupportedCharacter")
      assert.strictEqual(yield* encode(Pdf.text("a", { x: NaN, y: 0 })), "InvalidContent")
      assert.strictEqual(yield* encode(Pdf.rectangle({ x: 0, y: 0, width: -1, height: 1 })), "InvalidContent")
      assert.strictEqual(
        yield* encode(Pdf.line({ x1: 0, y1: 0, x2: 1, y2: 1, color: "red" as Pdf.Color })),
        "InvalidContent"
      )
      assert.strictEqual(
        yield* encode(Pdf.link("https://café.fr", { x: 0, y: 0, width: 1, height: 1 })),
        "InvalidContent"
      )
      assert.strictEqual(yield* encode(Pdf.image(new Uint8Array([1, 2, 3]), { x: 0, y: 0 })), "InvalidImage")
      assert.strictEqual(
        yield* encode(Pdf.image(png({ width: 1, height: 1, colorType: 6 }, [[0, 1, 2, 3]]), { x: 0, y: 0 })),
        "InvalidImage"
      )
      assert.strictEqual(
        yield* encode(
          Pdf.image(png({ width: 1, height: 1, colorType: 2, interlace: 1 }, [[0, 1, 2, 3]]), { x: 0, y: 0 })
        ),
        "UnsupportedImage"
      )
    }))
})
