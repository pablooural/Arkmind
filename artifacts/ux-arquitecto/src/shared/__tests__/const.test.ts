import { describe, it, expect } from "vitest";
import { COOKIE_NAME, ONE_YEAR_MS } from "../const";

describe("shared constants", () => {
  it("COOKIE_NAME is 'app_session_id'", () => {
    expect(COOKIE_NAME).toBe("app_session_id");
  });

  it("ONE_YEAR_MS equals 365 days in milliseconds", () => {
    const expected = 1000 * 60 * 60 * 24 * 365;
    expect(ONE_YEAR_MS).toBe(expected);
    expect(ONE_YEAR_MS).toBe(31_536_000_000);
  });
});
