import * as _ from "@fp-ts/schema/Decoder"

describe.concurrent("Decoder", () => {
  it("exports", () => {
    expect(_.make).exist
    expect(_.success).exist
    expect(_.failure).exist
    expect(_.failures).exist
    expect(_.warning).exist
    expect(_.warnings).exist
    expect(_.isSuccess).exist
    expect(_.isFailure).exist
    expect(_.isWarning).exist
  })
})
