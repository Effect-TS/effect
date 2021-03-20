// tracing: off

import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import * as Assoc from "@effect-ts/core/Associative"
import { absurd, pipe, tuple } from "@effect-ts/core/Function"
import * as Ident from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"
import * as O from "@effect-ts/core/Option"
import * as S from "@effect-ts/core/Show"
import * as MO from "@effect-ts/morphic"

import type { DocStream } from "../Core/DocStream"
import type { Color } from "./Color"
import * as Layer from "./Layer"
import { setSGRCode, SGR } from "./SGR"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

const Style_ = MO.make((F) =>
  F.interface(
    {
      foreground: F.option(SGR(F)),
      background: F.option(SGR(F)),
      bold: F.option(SGR(F)),
      italicized: F.option(SGR(F)),
      underlined: F.option(SGR(F))
    },
    { name: "Style" }
  )
)

export interface Style extends MO.AType<typeof Style_> {}
export interface StyleE extends MO.EType<typeof Style_> {}
export const Style = MO.opaque<StyleE, Style>()(Style_)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Associative = Assoc.struct<Style>({
  foreground: O.getFirstAssociative(),
  background: O.getFirstAssociative(),
  bold: O.getFirstAssociative(),
  italicized: O.getFirstAssociative(),
  underlined: O.getFirstAssociative()
})

export const Identity = Ident.struct<Style>({
  foreground: O.getFirstIdentity(),
  background: O.getFirstIdentity(),
  bold: O.getFirstIdentity(),
  italicized: O.getFirstIdentity(),
  underlined: O.getFirstIdentity()
})

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const color = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    foreground: O.some(SGR.as.SetColor({ color, layer: Layer.foreground, vivid: true }))
  })

export const bgColor = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    background: O.some(SGR.as.SetColor({ color, layer: Layer.background, vivid: true }))
  })

export const colorDull = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    foreground: O.some(
      SGR.as.SetColor({ color, layer: Layer.foreground, vivid: false })
    )
  })

export const bgColorDull = (color: Color): Style =>
  Style.build({
    ...Identity.identity,
    background: O.some(
      SGR.as.SetColor({ color, layer: Layer.background, vivid: false })
    )
  })

export const bold: Style = Style.build({
  ...Identity.identity,
  bold: O.some(SGR.as.SetBold({ bold: true }))
})

export const italicized: Style = Style.build({
  ...Identity.identity,
  italicized: O.some(SGR.as.SetItalicized({ italicized: true }))
})

export const underlined: Style = Style.build({
  ...Identity.identity,
  underlined: O.some(SGR.as.SetUnderlined({ underlined: true }))
})

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const render = (stream: DocStream<Style>): string => {
  const unsafePeek: (stack: Array<Style>) => Style = A.foldLeft(
    () => absurd<Style>(null as never),
    (x) => x
  )

  const unsafePop: (stack: Array<Style>) => readonly [Style, Array<Style>] = A.foldLeft(
    () => absurd<readonly [Style, Array<Style>]>(null as never),
    (x, xs) => tuple<readonly [Style, Array<Style>]>(x, xs)
  )

  const go = (x: DocStream<Style>) => (stack: Array<Style>): IO.IO<string> =>
    IO.gen(function* (_) {
      switch (x._tag) {
        case "Failed":
          return absurd<string>(x as never)
        case "EmptyStream":
          return Ident.string.identity
        case "CharStream": {
          const rest = yield* _(pipe(stack, go(x.stream)))
          return Ident.string.combine(x.char, rest)
        }
        case "TextStream": {
          const rest = yield* _(pipe(stack, go(x.stream)))
          return Ident.string.combine(x.text, rest)
        }
        case "LineStream": {
          const indent = pipe(x.indentation, A.replicate(" "), Ident.fold(Ident.string))
          const rest = yield* _(pipe(stack, go(x.stream)))
          return Ident.fold(Ident.string)(["\n", indent, rest])
        }
        case "PushAnnotation": {
          const currentStyle = unsafePeek(stack)
          const nextStyle = Identity.combine(x.annotation, currentStyle)
          const rest = yield* _(pipe(stack, A.cons(x.annotation), go(x.stream)))
          return Ident.string.combine(Show.show(nextStyle), rest)
        }
        case "PopAnnotation": {
          const [, styles] = unsafePop(stack)
          const nextStyle = unsafePeek(styles)
          const rest = yield* _(pipe(styles, go(x.stream)))
          return Ident.string.combine(Show.show(nextStyle), rest)
        }
        default:
          return absurd(x)
      }
    })
  return pipe(A.single(Identity.identity), go(stream), IO.run)
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const Show = S.makeShow<Style>((style) =>
  pipe(
    [
      O.some(SGR.as.Reset({})),
      style.foreground,
      style.background,
      style.bold,
      style.italicized,
      style.underlined
    ],
    A.compact,
    setSGRCode
  )
)
