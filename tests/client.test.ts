import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiGet, apiPost, apiPostForm, apiPut, apiDelete } from "../src/client.js";
import { ApiError } from "../src/errors.js";

const API_KEY = "test-api-key";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(jsonBody: unknown, overrides: Partial<Response> = {}) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => jsonBody,
    ...overrides,
  } as Response);
}

function mockFetchReject(error: Error) {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
}

describe("apiGet", () => {
  it("sends GET request with correct headers and returns data", async () => {
    mockFetch({ code: 0, data: { test: true } });

    const result = await apiGet("/test", API_KEY, { foo: "bar" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/test?foo=bar");
    expect(init.headers.get("X-API-Key")).toBe(API_KEY);
    expect(init.method).toBe("GET");
    expect(result).toEqual({ test: true });
  });

  it("skips undefined params", async () => {
    mockFetch({ code: 0, data: [] });

    await apiGet("/test", API_KEY, { foo: "bar", baz: undefined as unknown as string });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("foo=bar");
    expect(url).not.toContain("baz");
  });
});

describe("apiPost", () => {
  it("sends POST with JSON body", async () => {
    mockFetch({ code: 0, data: { id: 1 } });

    const result = await apiPost("/todos", API_KEY, { title: "test" });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ title: "test" });
    expect(result).toEqual({ id: 1 });
  });
});

describe("apiPostForm", () => {
  it("sends POST with FormData", async () => {
    mockFetch({ code: 0, data: { ok: true } });

    const form = new FormData();
    form.append("file", new Blob(["content"]));
    const result = await apiPostForm("/upload", API_KEY, form);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(form);
    expect(result).toEqual({ ok: true });
  });
});

describe("apiPut", () => {
  it("sends PUT with JSON body", async () => {
    mockFetch({ code: 0, data: { updated: true } });

    const result = await apiPut("/todos/1", API_KEY, { title: "updated" });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(result).toEqual({ updated: true });
  });

  it("omits Content-Type and body when no body provided", async () => {
    mockFetch({ code: 0, data: { msg: "ok" } });

    await apiPut("/todos/1/complete", API_KEY);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.body).toBeUndefined();
  });
});

describe("apiDelete", () => {
  it("sends DELETE request", async () => {
    mockFetch({ code: 0, data: { msg: "deleted" } });

    const result = await apiDelete("/todos/1", API_KEY);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(result).toEqual({ msg: "deleted" });
  });
});

describe("error handling", () => {
  it("throws ApiError on network failure", async () => {
    mockFetchReject(new Error("connect ECONNREFUSED"));

    await expect(apiGet("/test", API_KEY)).rejects.toThrow(ApiError);
    await expect(apiGet("/test", API_KEY)).rejects.toThrow("Network error");
  });

  it("throws ApiError when API returns non-zero code", async () => {
    mockFetch({ code: 1001, msg: "Invalid parameter" });

    await expect(apiGet("/test", API_KEY)).rejects.toThrow(ApiError);
    await expect(apiGet("/test", API_KEY)).rejects.toThrow("Invalid parameter");
  });

  it("throws ApiError on HTTP error status", async () => {
    mockFetch({ code: 401, msg: "Unauthorized" }, { ok: false, status: 401 });

    await expect(apiGet("/test", API_KEY)).rejects.toThrow(ApiError);
  });

  it("throws ApiError on invalid JSON response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("Unexpected token");
      },
    } as Response);

    await expect(apiGet("/test", API_KEY)).rejects.toThrow(ApiError);
    await expect(apiGet("/test", API_KEY)).rejects.toThrow("Invalid response");
  });
});
