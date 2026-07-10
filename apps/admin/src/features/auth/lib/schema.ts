import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  code: z.string().regex(/^\d{6}$/, "验证码为 6 位数字"),
});

export type LoginValues = z.infer<typeof loginSchema>;
