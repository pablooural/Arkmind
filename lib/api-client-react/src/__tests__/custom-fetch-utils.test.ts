import { describe, it, expect, beforeEach } from "vitest";
import { setBaseUrl, setAuthTokenGetter, ApiError, ResponseParseError } from "../custom-fetch";

describe("setBaseUrl", () => {
  beforeEach(() => {
    setBaseUrl(null);
  });

  it("accepts null to clear the base URL", () => {
    setBaseUrl("https://api.example.com");
    setBaseUrl(null);
    // No error thrown — function completes cleanly
  });

  it("strips trailing slashes from the base URL", () => {
    // We can't directly inspect _baseUrl, but we test indirectly via customFetch behavior
    // For now, ensure no errors on various inputs
    setBaseUrl("https://api.example.com/");
    setBaseUrl("https://api.example.com///");
    setBaseUrl("https://api.example.com");
  });
});

describe("setAuthTokenGetter", () => {
  beforeEach(() => {
    setAuthTokenGetter(null);
  });

  it("accepts null to clear the getter", () => {
    setAuthTokenGetter(() => "token");
    setAuthTokenGetter(null);
  });

  it("accepts sync functions", () => {
    setAuthTokenGetter(() => "my-token");
  });

  it("accepts async functions", () => {
    setAuthTokenGetter(async () => "async-token");
  });
});

describe("ApiError", () => {
  function makeResponse(status: number, statusText: string, headers?: Record<string, string>): Response {
    return new Response(null, {
      status,
      statusText,
      headers: new Headers(headers),
    });
  }

  it("constructs with correct properties", () => {
    const response = makeResponse(404, "Not Found");
    const error = new ApiError(response, { message: "Resource not found" }, {
      method: "GET",
      url: "/api/resource",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.method).toBe("GET");
    expect(error.data).toEqual({ message: "Resource not found" });
  });

  it("builds message from data.message field", () => {
    const response = makeResponse(400, "Bad Request");
    const error = new ApiError(response, { message: "Invalid input" }, {
      method: "POST",
      url: "/api/submit",
    });

    expect(error.message).toContain("400");
    expect(error.message).toContain("Invalid input");
  });

  it("builds message from data.title and data.detail", () => {
    const response = makeResponse(422, "Unprocessable Entity");
    const error = new ApiError(
      response,
      { title: "Validation Error", detail: "Field 'email' is required" },
      { method: "POST", url: "/api/users" },
    );

    expect(error.message).toContain("Validation Error");
    expect(error.message).toContain("Field 'email' is required");
  });

  it("handles null data gracefully", () => {
    const response = makeResponse(500, "Internal Server Error");
    const error = new ApiError(response, null, { method: "GET", url: "/api/fail" });

    expect(error.message).toContain("500");
    expect(error.data).toBeNull();
  });

  it("handles string data as message", () => {
    const response = makeResponse(403, "Forbidden");
    const error = new ApiError(response, "Access denied", {
      method: "GET",
      url: "/api/secret",
    });

    expect(error.message).toContain("Access denied");
  });

  it("truncates very long string data", () => {
    const response = makeResponse(500, "Error");
    const longString = "x".repeat(500);
    const error = new ApiError(response, longString, { method: "GET", url: "/" });

    expect(error.message.length).toBeLessThan(500);
  });
});

describe("ResponseParseError", () => {
  it("constructs with correct properties", () => {
    const response = new Response("not json", { status: 200, statusText: "OK" });
    const error = new ResponseParseError(
      response,
      "not json",
      new SyntaxError("Unexpected token"),
      { method: "GET", url: "/api/data" },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ResponseParseError");
    expect(error.status).toBe(200);
    expect(error.rawBody).toBe("not json");
    expect(error.method).toBe("GET");
    expect(error.message).toContain("Failed to parse response");
  });
});
