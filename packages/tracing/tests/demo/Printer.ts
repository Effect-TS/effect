import * as E from "@matechs/effect";

import { console } from "fp-ts";

export interface Printer {
  printer: {
    print(s: string): E.Effect<E.NoEnv, E.NoErr, void>;
  };
}

export const printer: Printer = {
  printer: {
    print(s) {
      return E.liftIO(console.log(s));
    }
  }
};

export function print(s: string) {
  return E.accessM(({ printer }: Printer) => printer.print(s));
}
