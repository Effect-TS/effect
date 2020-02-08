import { pipe } from "fp-ts/lib/pipeable";
import { App } from "../src/app";
import * as DT from "../src/date";
import { Foo } from "../view/Foo";

// alpha
/* istanbul ignore file */

// tslint:disable-next-line: no-default-export
export default App.page(pipe(Foo, DT.provideDateOps));
