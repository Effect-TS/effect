/* oxlint-disable no-undef */
// Generates `packages/effect/src/internal/pdfFontMetrics.ts`, the glyph widths
// `effect/encoding/Pdf` uses to measure text in the standard PDF fonts.
//
// The metrics come from the Adobe Core14 AFM files, as shipped in the npm
// package pdfkit@0.17.2 (integrity
// sha512-UnwF5fXy08f0dnp4jchFYAROKMNTaPqb/xgR8GtCzIcqoTnbOqtp3bwKvO4688oHI6vzEEs8Q6vqqEnC5IUELw==).
// To regenerate:
//
//   npm pack pdfkit@0.17.2
//   tar xzf pdfkit-0.17.2.tgz
//   node scripts/pdf-font-metrics.mjs package/js/data
//
// Each AFM file is checked against the SHA-256 digest below, and a rerun must
// produce no diff.
import * as Crypto from "node:crypto"
import * as Fs from "node:fs"
import * as Path from "node:path"

const DIGESTS = {
  "Helvetica": "da33f1870474c8e68bfe3e2353ff107ab6c6eea1f9836ce2aaf1e1a07b17982f",
  "Helvetica-Bold": "b880d96baf56d0cc059f258f60b4d764ef49b555ab9db294b959c0016dee41f2",
  "Helvetica-Oblique": "b4609b71b660a392ac09df35060271a876c2ce66617dd83bf826f742bb9d9721",
  "Helvetica-BoldOblique": "69984a35ca26973a39f261cf83e0d367ea2e6517c590b0b030d4d4a219d9c269",
  "Times-Roman": "768e1cabea085d489a63da3e80b96bc5abf0ec98d3073c9b4d6ba76e7bccba64",
  "Times-Bold": "b4a000ed85cb22c6cdd985aa0fd3f6f78ed5079b7c6860dc4f0234e0d0e3c522",
  "Times-Italic": "ed37fa2e6a67b5b17dfd47f36fc7e90df32891a4408860dbc8d4cbbe9959e242",
  "Times-BoldItalic": "93c4744ba955215de02c4aae0b777133442ada2f7ab5a2af30a040b792b3c55d",
  "Courier": "521e0d7c7521efd4be78a5a9c5398e4c67d0771e396115b0346bc4ef74ada53d",
  "Courier-Bold": "ad0150d4bedcc8877742bf94251fcec13e348dd599d4603f679d92027d1e6e99",
  "Courier-Oblique": "b27103b2a2ef6030c110626597e2ab47bb8279075a039ab9170facb0aa1f70e1",
  "Courier-BoldOblique": "cb82e69ef5f6d421e8f404fe00bb0d993425aae79725331d0ebf847e94e97e92"
}

// Glyph names of WinAnsiEncoding (PDF 32000-1:2008, Annex D.2) for codes 32 to
// 255; `null` marks the codes the encoding leaves undefined
const WIN_ANSI = [
  "space", "exclam", "quotedbl", "numbersign", "dollar", "percent", "ampersand", "quotesingle",
  "parenleft", "parenright", "asterisk", "plus", "comma", "hyphen", "period", "slash",
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "colon", "semicolon", "less", "equal", "greater", "question",
  "at", "A", "B", "C", "D", "E", "F", "G",
  "H", "I", "J", "K", "L", "M", "N", "O",
  "P", "Q", "R", "S", "T", "U", "V", "W",
  "X", "Y", "Z", "bracketleft", "backslash", "bracketright", "asciicircum", "underscore",
  "grave", "a", "b", "c", "d", "e", "f", "g",
  "h", "i", "j", "k", "l", "m", "n", "o",
  "p", "q", "r", "s", "t", "u", "v", "w",
  "x", "y", "z", "braceleft", "bar", "braceright", "asciitilde", null,
  "Euro", null, "quotesinglbase", "florin", "quotedblbase", "ellipsis", "dagger", "daggerdbl",
  "circumflex", "perthousand", "Scaron", "guilsinglleft", "OE", null, "Zcaron", null,
  null, "quoteleft", "quoteright", "quotedblleft", "quotedblright", "bullet", "endash", "emdash",
  "tilde", "trademark", "scaron", "guilsinglright", "oe", null, "zcaron", "Ydieresis",
  "space", "exclamdown", "cent", "sterling", "currency", "yen", "brokenbar", "section",
  "dieresis", "copyright", "ordfeminine", "guillemotleft", "logicalnot", "hyphen", "registered", "macron",
  "degree", "plusminus", "twosuperior", "threesuperior", "acute", "mu", "paragraph", "periodcentered",
  "cedilla", "onesuperior", "ordmasculine", "guillemotright", "onequarter", "onehalf", "threequarters", "questiondown",
  "Agrave", "Aacute", "Acircumflex", "Atilde", "Adieresis", "Aring", "AE", "Ccedilla",
  "Egrave", "Eacute", "Ecircumflex", "Edieresis", "Igrave", "Iacute", "Icircumflex", "Idieresis",
  "Eth", "Ntilde", "Ograve", "Oacute", "Ocircumflex", "Otilde", "Odieresis", "multiply",
  "Oslash", "Ugrave", "Uacute", "Ucircumflex", "Udieresis", "Yacute", "Thorn", "germandbls",
  "agrave", "aacute", "acircumflex", "atilde", "adieresis", "aring", "ae", "ccedilla",
  "egrave", "eacute", "ecircumflex", "edieresis", "igrave", "iacute", "icircumflex", "idieresis",
  "eth", "ntilde", "ograve", "oacute", "ocircumflex", "otilde", "odieresis", "divide",
  "oslash", "ugrave", "uacute", "ucircumflex", "udieresis", "yacute", "thorn", "ydieresis"
]

if (WIN_ANSI.length !== 224) throw new Error(`expected 224 WinAnsi codes, got ${WIN_ANSI.length}`)

const directory = process.argv[2]
if (directory === undefined) {
  console.error("usage: node scripts/pdf-font-metrics.mjs <pdfkit package/js/data directory>")
  process.exit(1)
}

const parse = (name) => {
  const bytes = Fs.readFileSync(Path.join(directory, `${name}.afm`))
  const digest = Crypto.createHash("sha256").update(bytes).digest("hex")
  if (digest !== DIGESTS[name]) throw new Error(`${name}.afm has SHA-256 ${digest}, expected ${DIGESTS[name]}`)
  const widths = new Map()
  let ascender
  let descender
  let notice
  for (const line of bytes.toString("latin1").split(/\r?\n/)) {
    if (line.startsWith("Comment Copyright ")) notice ??= line.slice(8).replace(/\s+/g, " ")
    else if (line.startsWith("Ascender ")) ascender = Number(line.slice(9))
    else if (line.startsWith("Descender ")) descender = Number(line.slice(10))
    else if (line.startsWith("C ")) {
      const width = /; WX (\d+) ;/.exec(line)
      const glyph = /; N (\S+) ;/.exec(line)
      if (width && glyph) widths.set(glyph[1], Number(width[1]))
    }
  }
  if (ascender === undefined || descender === undefined || notice === undefined) {
    throw new Error(`${name}.afm has no Ascender, Descender or copyright notice`)
  }
  const table = WIN_ANSI.map((glyph) => {
    if (glyph === null) return 0
    const width = widths.get(glyph)
    if (width === undefined) throw new Error(`${name}.afm has no glyph ${glyph}`)
    return width
  })
  return { name, ascender, descender, notice, table }
}

const fonts = Object.keys(DIGESTS).map(parse)

// Oblique faces share the widths of their upright faces, so identical tables
// are written once
const tables = []
const tableIndex = (table) => {
  const key = table.join(",")
  let index = tables.findIndex((existing) => existing.join(",") === key)
  if (index === -1) {
    index = tables.length
    tables.push(table)
  }
  return index
}
const entries = fonts.map((font) => ({ ...font, index: tableIndex(font.table) }))

// Rows of 16 widths in a template literal, which formatters leave as it is
const chunk = (table) => {
  const lines = []
  for (let i = 0; i < table.length; i += 16) lines.push(table.slice(i, i + 16).join(" "))
  return lines.join("\n")
}

const source = `// Generated by scripts/pdf-font-metrics.mjs. Do not edit manually.
//
// Glyph widths and vertical metrics of the standard PDF fonts, extracted from
// the Adobe Core14 AFM files. Modified from the original AFM files: only the
// widths of the WinAnsiEncoding glyphs, the ascender and the descender are kept.
//
// See THIRD_PARTY_NOTICES.md for the terms of use.
//
${[...new Set(fonts.map((font) => font.notice))].map((notice) => `// ${notice}`).join("\n")}

/** @internal */
export interface FontMetrics {
  // Advance widths in 1/1000 em of WinAnsiEncoding codes 32 to 255, 0 where
  // the code is undefined
  readonly widths: ReadonlyArray<number>
  readonly ascender: number
  readonly descender: number
}

const parse = (widths: string): ReadonlyArray<number> => widths.trim().split(/\\s+/).map(Number)

${tables.map((table, index) => `const widths${index} = parse(\`\n${chunk(table)}\n\`)`).join("\n\n")}

/** @internal */
export const fontMetrics: Record<string, FontMetrics> = {
${
  entries.map((font) =>
    `  ${JSON.stringify(font.name)}: { widths: widths${font.index}, ascender: ${font.ascender}, descender: ${font.descender} }`
  ).join(",\n")
}
}
`

Fs.writeFileSync("packages/effect/src/internal/pdfFontMetrics.ts", source)
