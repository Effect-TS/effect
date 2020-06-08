import * as T from "@matechs/core/Effect"
import * as L from "@matechs/core/Layer"

export const PrinterURI = "@matechs/tracing/demo/PrinterURI"

export interface Printer {
  [PrinterURI]: {
    print(s: string): T.Sync<void>
  }
}

export const Printer = L.fromValue<Printer>({
  [PrinterURI]: {
    print: (s) =>
      T.sync(() => {
        console.log(s)
      })
  }
})

export function print(s: string) {
  return T.accessM(({ [PrinterURI]: printer }: Printer) => printer.print(s))
}
