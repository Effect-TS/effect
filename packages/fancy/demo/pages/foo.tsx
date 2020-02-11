import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import { Foo } from "../view/Foo";
import { DT } from "../modules/date";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Foo, DT.provide));
