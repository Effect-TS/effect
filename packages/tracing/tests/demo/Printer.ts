import * as E from "@matechs/effect";

export interface Printer {
  printer: {
    print(s: string): E.Effect<E.NoEnv, E.NoErr, void>;
  };
}

export const printer: Printer = {} as Printer; // not implemented for the purpose of tests it will not be called

export function print(s: string) {
  return E.accessM(({ printer }: Printer) => printer.print(s));
}
