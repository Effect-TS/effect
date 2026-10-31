import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Pdf from "effect/encoding/Pdf"
import { deflateSync, inflateSync } from "node:zlib"

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1")

// Objects of an encoded document by number, with their streams inflated when
// they are compressed
const objects = (bytes: Uint8Array) => {
  const source = latin1(bytes)
  const result = new Map<number, { readonly dictionary: string; readonly stream: Uint8Array | undefined }>()
  for (const match of source.matchAll(/(\d+) 0 obj\n([\s\S]*?)\nendobj\n/g)) {
    const body = match[2]
    const streamAt = body.indexOf("\nstream\n")
    if (streamAt === -1) {
      result.set(Number(match[1]), { dictionary: body, stream: undefined })
      continue
    }
    const dictionary = body.slice(0, streamAt)
    const raw = Buffer.from(body.slice(streamAt + 8, body.lastIndexOf("\nendstream")), "latin1")
    const stream = dictionary.includes("/FlateDecode") && !dictionary.includes("/DecodeParms")
      ? inflateSync(raw)
      : raw
    result.set(Number(match[1]), { dictionary, stream: new Uint8Array(stream) })
  }
  return result
}

const find = (bytes: Uint8Array, pattern: RegExp) => {
  for (const object of objects(bytes).values()) {
    if (pattern.test(object.dictionary)) return object
  }
  throw new Error(`no object matches ${pattern}`)
}

const pageContent = (bytes: Uint8Array) => {
  const page = find(bytes, /\/Type \/Page /)
  const id = Number(/\/Contents (\d+) 0 R/.exec(page.dictionary)![1])
  return latin1(objects(bytes).get(id)!.stream!)
}

const failure = <A>(effect: Effect.Effect<A, Pdf.PdfError>) => Effect.map(Effect.flip(effect), (error) => error.kind)

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xFFFFFFFF
  for (const byte of bytes) {
    crc ^= byte
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1))
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

const chunk = (type: string, data: Uint8Array) => {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, "latin1")
  out.set(data, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

// Writes 8-bit PNG images, filtering row `y` with filter type `y % 5`
const makePng = (options: {
  readonly width: number
  readonly height: number
  readonly colorType: number
  readonly channels: number
  readonly pixels: ReadonlyArray<number>
  readonly interlaced?: boolean
  readonly palette?: ReadonlyArray<number>
  readonly transparency?: ReadonlyArray<number>
}) => {
  const { channels, colorType, height, width } = options
  const pixel = (x: number, y: number) =>
    options.pixels.slice((y * width + x) * channels, (y * width + x + 1) * channels)
  const filtered: Array<number> = []
  const writePass = (columns: ReadonlyArray<number>, rows: ReadonlyArray<number>) => {
    let previous: Array<number> = []
    rows.forEach((y, index) => {
      const row = columns.flatMap((x) => pixel(x, y))
      const filter = index % 5
      filtered.push(filter)
      row.forEach((value, i) => {
        const left = i >= channels ? row[i - channels] : 0
        const up = previous[i] ?? 0
        const upLeft = i >= channels ? previous[i - channels] ?? 0 : 0
        const p = left + up - upLeft
        const predictor = [
          0,
          left,
          up,
          (left + up) >> 1,
          Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - upLeft)
            ? left
            : Math.abs(p - up) <= Math.abs(p - upLeft)
            ? up
            : upLeft
        ][filter]
        filtered.push((value - predictor) & 0xFF)
      })
      previous = row
    })
  }
  const range = (start: number, end: number, step: number) => {
    const out: Array<number> = []
    for (let i = start; i < end; i += step) out.push(i)
    return out
  }
  if (options.interlaced) {
    for (
      const [x0, y0, dx, dy] of [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [
        0,
        1,
        1,
        2
      ]]
    ) {
      const columns = range(x0, width, dx)
      if (columns.length > 0) writePass(columns, range(y0, height, dy))
    }
  } else {
    writePass(range(0, width, 1), range(0, height, 1))
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, colorType, 0, 0, options.interlaced ? 1 : 0], 8)
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", header),
    ...(options.palette ? [chunk("PLTE", new Uint8Array(options.palette))] : []),
    ...(options.transparency ? [chunk("tRNS", new Uint8Array(options.transparency))] : []),
    chunk("IDAT", deflateSync(new Uint8Array(filtered))),
    chunk("IEND", new Uint8Array(0))
  ]))
}

// Baseline JPEG headers, without entropy-coded data
const makeJpeg = (width: number, height: number, components: number, adobe = false) =>
  new Uint8Array([
    0xFF,
    0xD8,
    ...(adobe ? [0xFF, 0xEE, 0x00, 0x0E, 0x41, 0x64, 0x6F, 0x62, 0x65, 0, 100, 0, 0, 0, 0, 2] : []),
    0xFF,
    0xC0,
    0x00,
    8 + components * 3,
    8,
    height >> 8,
    height & 0xFF,
    width >> 8,
    width & 0xFF,
    components,
    ...Array.from({ length: components }, (_, i) => [i + 1, 0x11, 0]).flat(),
    0xFF,
    0xD9
  ])

describe("Pdf", () => {
  it.effect("writes a cross-reference table that locates every object", () =>
    Effect.gen(function*() {
      const bytes = yield* Pdf.encode(Pdf.document([
        Pdf.page([Pdf.text("One", { x: 10, y: 10 })]),
        Pdf.page([Pdf.text("Two", { x: 10, y: 10 })], { size: Pdf.landscape(Pdf.Letter) })
      ]))
      const source = latin1(bytes)
      assert.isTrue(source.startsWith("%PDF-1.7\n"))
      assert.isTrue(source.endsWith("%%EOF\n"))
      const startxref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(source)![1])
      assert.isTrue(source.startsWith("xref\n", startxref))
      const [, first, count] = /^xref\n(\d+) (\d+)\n/.exec(source.slice(startxref))!
      assert.strictEqual(first, "0")
      const entries = source.slice(startxref).split("\n").slice(2, 2 + Number(count))
      entries.slice(1).forEach((entry, i) => {
        assert.strictEqual(entry.length, 19)
        assert.isTrue(source.startsWith(`${i + 1} 0 obj\n`, Number(entry.slice(0, 10))))
      })
      assert.include(source, `/Size ${count} /Root 1 0 R`)
      assert.match(source, /\/Type \/Pages \/Kids \[\d+ 0 R \d+ 0 R\] \/Count 2/)
      assert.include(source, "/MediaBox [0 0 792 612]")
      // Both pages share one font object
      assert.strictEqual(source.match(/\/Type \/Font/g)!.length, 1)
    }))

  it("wraps and measures text with the standard font metrics", () => {
    // Helvetica widths: "Hello" is 2278/1000 em, a space 278/1000 em
    assert.deepStrictEqual(Pdf.measureText("Hello", { size: 10 }), { lines: ["Hello"], width: 22.78, height: 12 })
    assert.deepStrictEqual(
      Pdf.measureText("Hello Hello Hello\n\nabcdefghijk", { size: 10, width: 50, lineHeight: 1 }).lines,
      ["Hello Hello", "Hello", "", "abcdefghij", "k"]
    )
    // Courier is monospaced at 600/1000 em
    assert.strictEqual(Pdf.measureText("€ … ‘’", { font: "Courier", size: 10 }).width, 36)
  })

  it.effect("places text from the top-left corner of the page", () =>
    Effect.gen(function*() {
      const bytes = yield* Pdf.encode(
        Pdf.document([
          Pdf.page([
            Pdf.text("Hello Hello Hello €", {
              x: 10,
              y: 20,
              size: 10,
              width: 50,
              align: "justify",
              font: "Times-Bold",
              color: Pdf.rgb(1, 0, 0)
            })
          ], { size: { width: 200, height: 100 } })
        ]),
        { compress: false }
      )
      assert.include(latin1(bytes), "/BaseFont /Times-Bold /Encoding /WinAnsiEncoding")
      const content = pageContent(bytes)
      assert.include(content, "/F1 10 Tf\n1 0 0 rg\n")
      // Times-Bold: ascender 683, descender -217, so the glyphs take 9 of the
      // 12 points of each line and the first baseline is 1.5 + 6.83 below y
      assert.include(content, "1 0 0 1 10 71.67 Tm\n<48656c6c6f2048656c6c6f> Tj\n")
      assert.include(content, "1 0 0 1 10 59.67 Tm\n")
      // The first line is stretched to the width, the last is not
      assert.match(content, /^[\d.]+ Tw$/m)
      assert.include(content, "0 Tw\n1 0 0 1 10 59.67 Tm\n<48656c6c6f2080> Tj\n")
    }))

  it.effect("draws shapes with styles and opacity", () =>
    Effect.gen(function*() {
      const bytes = yield* Pdf.encode(
        Pdf.document([
          Pdf.page([
            Pdf.rect({ x: 10, y: 10, width: 30, height: 20, fill: Pdf.gray(0.5), opacity: 0.25 }),
            Pdf.line({ x1: 0, y1: 0, x2: 100, y2: 100, dash: [3, 2], lineCap: "round", lineWidth: 2 }),
            Pdf.path([Pdf.moveTo(0, 0), Pdf.curveTo(1, 2, 3, 4, 5, 6), Pdf.close], {
              fill: Pdf.cmyk(0, 1, 0, 0),
              stroke: Pdf.rgb(0, 0, 1),
              fillRule: "evenodd"
            })
          ], { size: { width: 100, height: 100 } })
        ]),
        { compress: false }
      )
      const content = pageContent(bytes)
      assert.include(content, "/GS1 gs\n0.5 g\n10 90 m\n40 90 l\n40 70 l\n10 70 l\nh\nf\n")
      assert.include(content, "0 G\n2 w\n1 J\n[3 2] 0 d\n0 100 m\n100 0 l\nS\n")
      assert.include(content, "0 1 0 0 k\n0 0 1 RG\n1 w\n0 100 m\n1 98 3 96 5 94 c\nh\nB*\n")
      assert.include(latin1(bytes), "/ExtGState << /GS1 << /Type /ExtGState /ca 0.25 /CA 0.25 >> >>")
    }))

  it.effect("writes links and metadata", () =>
    Effect.gen(function*() {
      const bytes = yield* Pdf.encode(
        Pdf.document([
          Pdf.page([Pdf.link({ url: "https://example.com/ä(1)", x: 10, y: 10, width: 50, height: 20 })], {
            size: { width: 100, height: 100 }
          })
        ], { title: "Report (draft)", author: "Zoë", creationDate: new Date("2026-10-31T02:06:45Z") })
      )
      const source = latin1(bytes)
      assert.include(
        source,
        "/Rect [10 70 60 90] /Border [0 0 0] /A << /Type /Action /S /URI /URI (https://example.com/%C3%A4\\(1\\)) >>"
      )
      assert.match(source, /\/Annots \[\d+ 0 R\]/)
      assert.include(
        source,
        "<< /Title (Report \\(draft\\)) /Author <feff005a006f00eb> /CreationDate (D:20261031020645Z) >>"
      )
      assert.match(source, /\/Info \d+ 0 R/)
    }))

  it.effect("embeds JPEG images as they are", () =>
    Effect.gen(function*() {
      const data = makeJpeg(300, 200, 4, true)
      const jpeg = yield* Pdf.jpeg(data)
      assert.deepStrictEqual([jpeg.format, jpeg.width, jpeg.height], ["jpeg", 300, 200])
      const bytes = yield* Pdf.encode(Pdf.document([
        Pdf.page([
          Pdf.image(jpeg, { x: 10, y: 10, width: 150 }),
          Pdf.image(jpeg, { x: 10, y: 200, height: 50, opacity: 0.5 })
        ], { size: { width: 400, height: 400 } })
      ]))
      const image = find(bytes, /\/Subtype \/Image/)
      assert.include(image.dictionary, "/Width 300 /Height 200 /ColorSpace /DeviceCMYK /BitsPerComponent 8")
      assert.include(image.dictionary, "/Decode [1 0 1 0 1 0 1 0] /Filter /DCTDecode")
      assert.deepStrictEqual(image.stream, data)
      const content = pageContent(bytes)
      assert.include(content, "150 0 0 100 10 290 cm\n/Im1 Do\n")
      assert.include(content, "/GS1 gs\n75 0 0 50 10 150 cm\n/Im1 Do\n")
      assert.strictEqual(latin1(bytes).match(/\/Subtype \/Image/g)!.length, 1)
    }))

  it.effect("embeds opaque PNG images without decoding them", () =>
    Effect.gen(function*() {
      const data = makePng({
        width: 2,
        height: 2,
        colorType: 2,
        channels: 3,
        pixels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      })
      const png = yield* Pdf.png(data)
      const bytes = yield* Pdf.encode(Pdf.document([Pdf.page([Pdf.image(png, { x: 0, y: 0 })])]))
      const image = find(bytes, /\/Subtype \/Image/)
      assert.include(
        image.dictionary,
        "/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns 2 >>"
      )
      const idatLength = Buffer.from(data).readUInt32BE(33 + 0)
      assert.deepStrictEqual(image.stream, data.subarray(33 + 8, 33 + 8 + idatLength))
    }))

  it.effect("decodes PNG transparency into a soft mask", () =>
    Effect.gen(function*() {
      // 3 × 9 pixels, so that every interlace pass and filter type is used
      const width = 3
      const height = 9
      const rgba = Array.from({ length: width * height * 4 }, (_, i) => (i * 37 + 11) & 0xFF)
      for (const interlaced of [false, true]) {
        const png = yield* Pdf.png(makePng({ width, height, colorType: 6, channels: 4, pixels: rgba, interlaced }))
        const bytes = yield* Pdf.encode(Pdf.document([Pdf.page([Pdf.image(png, { x: 0, y: 0 })])]))
        const image = find(bytes, /\/ColorSpace \/DeviceRGB/)
        const maskId = Number(/\/SMask (\d+) 0 R/.exec(image.dictionary)![1])
        const mask = objects(bytes).get(maskId)!
        assert.include(mask.dictionary, "/ColorSpace /DeviceGray /BitsPerComponent 8")
        assert.deepStrictEqual(Array.from(image.stream!), rgba.filter((_, i) => i % 4 !== 3))
        assert.deepStrictEqual(Array.from(mask.stream!), rgba.filter((_, i) => i % 4 === 3))
      }

      // Palette entries without a tRNS value are opaque
      const indexed = yield* Pdf.png(makePng({
        width: 3,
        height: 1,
        colorType: 3,
        channels: 1,
        pixels: [0, 1, 2],
        palette: [255, 0, 0, 0, 255, 0, 0, 0, 255],
        transparency: [0, 128]
      }))
      const bytes = yield* Pdf.encode(Pdf.document([Pdf.page([Pdf.image(indexed, { x: 0, y: 0 })])]))
      const image = find(bytes, /\/Indexed/)
      assert.include(image.dictionary, "/ColorSpace [/Indexed /DeviceRGB 2 <ff000000ff000000ff>]")
      const maskId = Number(/\/SMask (\d+) 0 R/.exec(image.dictionary)![1])
      assert.deepStrictEqual(Array.from(objects(bytes).get(maskId)!.stream!), [0, 128, 255])
    }))

  it.effect("fails on content it cannot write", () =>
    Effect.gen(function*() {
      const encode = (content: Pdf.Content) => failure(Pdf.encode(Pdf.document([Pdf.page([content])])))
      assert.strictEqual(yield* encode(Pdf.text("ok 🙂", { x: 0, y: 0 })), "UnsupportedCharacter")
      assert.strictEqual(
        yield* encode(Pdf.rect({ x: 0, y: 0, width: 1, height: 1, fill: Pdf.rgb(255, 0, 0) })),
        "InvalidValue"
      )
      assert.strictEqual(yield* encode(Pdf.line({ x1: 0, y1: 0, x2: NaN, y2: 0 })), "InvalidValue")
      assert.strictEqual(
        yield* encode(Pdf.image({ format: "png", width: 1, height: 1 }, { x: 0, y: 0 })),
        "InvalidValue"
      )
      assert.strictEqual(yield* failure(Pdf.png(new Uint8Array([1, 2, 3]))), "InvalidImage")
      assert.strictEqual(yield* failure(Pdf.jpeg(makeJpeg(0, 10, 3))), "InvalidImage")

      // A corrupt PNG is only noticed when its data is decoded
      const png = makePng({ width: 1, height: 1, colorType: 6, channels: 4, pixels: [1, 2, 3, 4] })
      const corrupt = png.slice()
      corrupt[41] = 0
      const image = yield* Pdf.png(corrupt)
      assert.strictEqual(yield* encode(Pdf.image(image, { x: 0, y: 0 })), "InvalidImage")
    }))
})
