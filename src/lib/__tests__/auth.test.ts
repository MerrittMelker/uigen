import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist jose mocks
const { mockSign, mockSignJWT } = vi.hoisted(() => {
  const mockSign = vi.fn();
  const mockSignJWT = vi.fn(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  }));

  return { mockSign, mockSignJWT };
});

// Mock jose library to avoid TextEncoder issues
vi.mock("jose", () => ({
  SignJWT: mockSignJWT,
  jwtVerify: vi.fn(),
}));

// Hoist cookie mocks
const { mockCookieSet, mockCookies } = vi.hoisted(() => {
  const mockCookieSet = vi.fn();
  const mockCookies = vi.fn(() => Promise.resolve({
    set: mockCookieSet,
    get: vi.fn(),
    delete: vi.fn(),
  }));

  return { mockCookieSet, mockCookies };
});

// Mock server-only to avoid import errors in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

// Import after mocks are set up
import { createSession } from "../auth";

describe("createSession", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to development by default
    process.env.NODE_ENV = "development";
    // Mock sign to return a fake JWT token
    mockSign.mockResolvedValue("fake.jwt.token");
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("creates a session and sets a cookie", async () => {
    const userId = "user-123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockCookies).toHaveBeenCalled();
    expect(mockCookieSet).toHaveBeenCalled();
  });

  it("sets cookie with name 'auth-token'", async () => {
    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const cookieName = callArgs[0];

    expect(cookieName).toBe("auth-token");
  });

  it("sets cookie with the JWT token value", async () => {
    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const token = callArgs[1];

    expect(token).toBe("fake.jwt.token");
    expect(mockSign).toHaveBeenCalled();
  });

  it("creates JWT with correct payload data", async () => {
    const userId = "user-456";
    const email = "admin@example.com";

    await createSession(userId, email);

    // Check that SignJWT was called with session data
    expect(mockSignJWT).toHaveBeenCalled();
    const callArgs = mockSignJWT.mock.calls[0];
    const payload = callArgs[0];

    expect(payload.userId).toBe(userId);
    expect(payload.email).toBe(email);
    expect(payload.expiresAt).toBeInstanceOf(Date);
  });

  it("sets JWT with HS256 algorithm in protected header", async () => {
    const mockSetProtectedHeader = vi.fn().mockReturnThis();
    mockSignJWT.mockReturnValueOnce({
      setProtectedHeader: mockSetProtectedHeader,
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: mockSign,
    });

    await createSession("user-123", "test@example.com");

    expect(mockSetProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  });

  it("sets JWT expiration time to 7 days", async () => {
    const mockSetExpirationTime = vi.fn().mockReturnThis();
    mockSignJWT.mockReturnValueOnce({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: mockSetExpirationTime,
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: mockSign,
    });

    await createSession("user-123", "test@example.com");

    expect(mockSetExpirationTime).toHaveBeenCalledWith("7d");
  });

  it("sets JWT issued at timestamp", async () => {
    const mockSetIssuedAt = vi.fn().mockReturnThis();
    mockSignJWT.mockReturnValueOnce({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: mockSetIssuedAt,
      sign: mockSign,
    });

    await createSession("user-123", "test@example.com");

    expect(mockSetIssuedAt).toHaveBeenCalled();
  });

  it("sets cookie with httpOnly flag", async () => {
    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.httpOnly).toBe(true);
  });

  it("sets cookie with secure flag in production", async () => {
    process.env.NODE_ENV = "production";

    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.secure).toBe(true);
  });

  it("sets cookie without secure flag in development", async () => {
    process.env.NODE_ENV = "development";

    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.secure).toBe(false);
  });

  it("sets cookie without secure flag in test environment", async () => {
    process.env.NODE_ENV = "test";

    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.secure).toBe(false);
  });

  it("sets cookie with sameSite lax", async () => {
    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.sameSite).toBe("lax");
  });

  it("sets cookie with root path", async () => {
    await createSession("user-123", "test@example.com");

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.path).toBe("/");
  });

  it("sets cookie with expiration date approximately 7 days from now", async () => {
    const beforeTime = Date.now();
    await createSession("user-123", "test@example.com");
    const afterTime = Date.now();

    const callArgs = mockCookieSet.mock.calls[0];
    const options = callArgs[2];

    expect(options.expires).toBeInstanceOf(Date);

    const expiresTime = options.expires.getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    // Check that expiration is approximately 7 days from now (within 1 second tolerance)
    expect(expiresTime).toBeGreaterThanOrEqual(beforeTime + sevenDaysInMs - 1000);
    expect(expiresTime).toBeLessThanOrEqual(afterTime + sevenDaysInMs + 1000);
  });

  it("includes expiresAt in JWT payload with correct 7-day expiration", async () => {
    const beforeTime = Date.now();
    await createSession("user-123", "test@example.com");
    const afterTime = Date.now();

    const payload = mockSignJWT.mock.calls[0][0];
    const expiresAt = payload.expiresAt;

    expect(expiresAt).toBeInstanceOf(Date);

    const expiresTime = expiresAt.getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresTime).toBeGreaterThanOrEqual(beforeTime + sevenDaysInMs - 1000);
    expect(expiresTime).toBeLessThanOrEqual(afterTime + sevenDaysInMs + 1000);
  });

  it("handles special characters in email", async () => {
    const userId = "user-789";
    const email = "test+tag@example.com";

    await createSession(userId, email);

    expect(mockCookieSet).toHaveBeenCalled();
    const payload = mockSignJWT.mock.calls[0][0];
    expect(payload.email).toBe(email);
  });

  it("handles long userId", async () => {
    const userId = "a".repeat(1000);
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockCookieSet).toHaveBeenCalled();
    const payload = mockSignJWT.mock.calls[0][0];
    expect(payload.userId).toBe(userId);
  });

  it("handles empty string userId", async () => {
    const userId = "";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockCookieSet).toHaveBeenCalled();
    const payload = mockSignJWT.mock.calls[0][0];
    expect(payload.userId).toBe("");
  });

  it("handles email with unicode characters", async () => {
    const userId = "user-123";
    const email = "test@例え.com";

    await createSession(userId, email);

    expect(mockCookieSet).toHaveBeenCalled();
    const payload = mockSignJWT.mock.calls[0][0];
    expect(payload.email).toBe(email);
  });

  it("calls cookies function to get cookie store", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookies).toHaveBeenCalledOnce();
  });

  it("awaits JWT signing before setting cookie", async () => {
    let signResolved = false;
    mockSign.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      signResolved = true;
      return "fake.jwt.token";
    });

    await createSession("user-123", "test@example.com");

    // Cookie should only be set after JWT is signed
    expect(signResolved).toBe(true);
    expect(mockCookieSet).toHaveBeenCalled();
  });
});
