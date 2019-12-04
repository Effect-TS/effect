import * as T from "./effect";
import { ExitTag } from "waveguide/lib/exit";

let called = false;

T.run(
  T.onInterrupted(
    T.delay(T.raiseInterrupt, 100),
    T.sync(() => {
      called = true;
    })
  ),
  r => {
    console.log(r._tag);
    console.log(ExitTag.Interrupt)
    console.log(called);
  }
);
