import { HKTFull } from "./hkt"

export type AnyHKT = HKTFull<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

export type HKTTypeS<H extends AnyHKT> = H["_St"]

export type HKTTypeSO<H extends AnyHKT> = ReturnType<H["_O"]>

export type HKTTypeSI<H extends AnyHKT> = Parameters<H["_I"]>[0]
