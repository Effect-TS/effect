import * as E from "@matechs/effect";
import * as D from "@matechs/effect/lib/derivation";

import { console } from "fp-ts";

export interface Printer {
  printer: {
    print(s: string): E.Effect<E.NoEnv, E.NoErr, void>;
  };
}

export const printer: Printer = {
  printer: {
    print(s: string) {
      return E.liftIO(console.log(s));
    }
  }
};

export const {
  printer: { print }
} = D.derivePublicHelpers(printer);
