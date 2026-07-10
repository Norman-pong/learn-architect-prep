import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailOutlined, LockOutlined } from "@/components/ui/icons";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth";
import { sendCode, verifyCode } from "./api";
import { loginSchema, type LoginValues } from "./lib/schema";

const COUNTDOWN_SECONDS = 60;

export function LoginForm() {
  const navigate = useNavigate({ from: "/login" });
  const setAuth = useAuthStore((s) => s.setAuth);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", code: "" },
  });

  const email = watch("email");

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const valid = await trigger("email");
    if (!valid) return;

    setSending(true);
    try {
      await sendCode(email);
      setCountdown(COUNTDOWN_SECONDS);
      toast.success("验证码已发送，请查收邮箱");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async (values: LoginValues) => {
    setLoggingIn(true);
    try {
      const { accessToken } = await verifyCode(values.email, values.code);
      setAuth({ id: values.email, email: values.email }, accessToken);
      toast.success("登录成功");
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto mt-20 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LockOutlined className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">ArchPrep</h1>
          <p className="mt-2 text-sm text-muted-foreground">系统架构设计师备考平台</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-card-foreground">
              邮箱
            </label>
            <div className="relative">
              <MailOutlined className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="pl-9"
                error={!!errors.email}
                {...register("email", { onBlur: () => trigger("email") })}
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-card-foreground">
              验证码
            </label>
            <div className="flex gap-3">
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 位验证码"
                className="flex-1"
                error={!!errors.code}
                {...register("code", { onBlur: () => trigger("code") })}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={countdown > 0 || sending}
                onClick={handleSendCode}
              >
                {countdown > 0 ? `${countdown}s 后重发` : "发送验证码"}
              </Button>
            </div>
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          登录即表示你同意继续使用 ArchPrep 服务
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
