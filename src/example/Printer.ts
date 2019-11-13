import * as E from "../index";
import { console } from "fp-ts";

export interface Printer {
  printer: {
    print(s: string): E.Effect<E.NoEnv, E.NoErr, void>;
  };
}

export function print(s: string) {
  return E.accessM(({ printer }: Printer) => printer.print(s));
}

export const printer: Printer = {
  printer: {
    print(s: string) {
      return E.liftIO(console.log(s));
    }
  }
};

