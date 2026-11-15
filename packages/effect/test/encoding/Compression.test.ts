import * as GzipTest from "./CompressionConformance/GzipTest.ts"
import * as Lz4Test from "./CompressionConformance/Lz4Test.ts"
import * as SnappyTest from "./CompressionConformance/SnappyTest.ts"
import * as ZstdTest from "./CompressionConformance/ZstdTest.ts"

SnappyTest.suite()
GzipTest.suite()
Lz4Test.suite()
ZstdTest.suite()
