import * as MO from '@effect-ts/morphic'

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

const Background_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral('Background') }, { name: 'Background' })
)

export interface Background extends MO.AType<typeof Background_> {}
export interface BackgroundE extends MO.EType<typeof Background_> {}
export const Background = MO.opaque<BackgroundE, Background>()(Background_)

const Foreground_ = MO.make((F) =>
  F.interface({ _tag: F.stringLiteral('Foreground') }, { name: 'Foreground' })
)

export interface Foreground extends MO.AType<typeof Foreground_> {}
export interface ForegroundE extends MO.EType<typeof Foreground_> {}
export const Foreground = MO.opaque<ForegroundE, Foreground>()(Foreground_)

export const Layer = MO.makeADT('_tag')({ Background, Foreground })
export type Layer = MO.AType<typeof Layer>

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const foreground: Layer = Layer.as.Foreground({})

export const background: Layer = Layer.as.Background({})
