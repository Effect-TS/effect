import { T } from "@matechs/prelude"

export interface Printer {
  printer: {
    print(s: string): T.Sync<void>
  }
}

export const printer: Printer = {} as Printer // not implemented for the purpose of tests it will not be called

export function print(s: string) {
  return T.accessM(({ printer }: Printer) => printer.print(s))
}
