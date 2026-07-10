import { api } from "@/lib/api";

export async function sendCode(email: string): Promise<void> {
  const { error } = await api.auth["send-code"].post({ email });
  if (error) throw new Error(typeof error.value === "string" ? error.value : "发送验证码失败");
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data, error } = await api.auth.verify.post({ email, code });
  if (error) throw new Error(typeof error.value === "string" ? error.value : "登录失败");
  if (!data || typeof data !== "object" || !("accessToken" in data)) {
    throw new Error("登录失败");
  }
  return data as { accessToken: string; refreshToken: string };
}
