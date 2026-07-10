import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "../index";

// Mock auth store
vi.mock("../../../stores/auth", () => ({
  useAuthStore: () => ({
    setAuth: vi.fn(),
  }),
}));

// Mock toast
vi.mock("../../../components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API
vi.mock("../api", () => ({
  sendCode: vi.fn(),
  verifyCode: vi.fn(),
}));

// Mock router navigate
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("LoginForm", () => {
  it("renders login form with email and code fields", () => {
    render(<LoginForm />);

    expect(screen.getByText("ArchPrep")).toBeInTheDocument();
    expect(screen.getByText("系统架构设计师备考平台")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("验证码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送验证码" })).toBeInTheDocument();
  });

  it("shows email validation error for invalid email", async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("邮箱");
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText("请输入有效邮箱")).toBeInTheDocument();
    });
  });

  it("shows code validation error for non-6-digit code", async () => {
    render(<LoginForm />);

    const codeInput = screen.getByLabelText("验证码");
    fireEvent.change(codeInput, { target: { value: "123" } });
    fireEvent.blur(codeInput);

    await waitFor(() => {
      expect(screen.getByText("验证码为 6 位数字")).toBeInTheDocument();
    });
  });

  it("shows code validation error for non-numeric code", async () => {
    render(<LoginForm />);

    const codeInput = screen.getByLabelText("验证码");
    fireEvent.change(codeInput, { target: { value: "abc123" } });
    fireEvent.blur(codeInput);

    await waitFor(() => {
      expect(screen.getByText("验证码为 6 位数字")).toBeInTheDocument();
    });
  });

  it("accepts valid 6-digit code", async () => {
    render(<LoginForm />);

    const codeInput = screen.getByLabelText("验证码");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.blur(codeInput);

    await waitFor(() => {
      expect(screen.queryByText("验证码为 6 位数字")).not.toBeInTheDocument();
    });
  });
});
