import { describe, it, expect } from "vitest";
import { fanOut } from "../src/utils.js";

describe("fanOut", () => {
  it("returns all successes", async () => {
    const result = await fanOut(["a", "b"], async (id) => `result-${id}`);

    expect(result.success).toEqual({ a: "result-a", b: "result-b" });
    expect(result.failed).toEqual({});
  });

  it("returns partial failures with error messages", async () => {
    const result = await fanOut(["a", "b", "c"], async (id) => {
      if (id === "b") throw new Error("boom");
      return `result-${id}`;
    });

    expect(result.success).toEqual({ a: "result-a", c: "result-c" });
    expect(result.failed).toEqual({ b: "boom" });
  });

  it("handles all failures", async () => {
    const result = await fanOut(["x", "y"], async () => {
      throw new Error("all broken");
    });

    expect(result.success).toEqual({});
    expect(Object.keys(result.failed)).toHaveLength(2);
  });

  it("handles empty device list", async () => {
    const fn = async (id: string) => id;
    const result = await fanOut([], fn);

    expect(result.success).toEqual({});
    expect(result.failed).toEqual({});
  });

  it("handles non-Error thrown values", async () => {
    const result = await fanOut(["a"], async () => {
      throw "string error"; // eslint-disable-line no-throw-literal
    });

    expect(result.failed.a).toBe("string error");
  });
});
