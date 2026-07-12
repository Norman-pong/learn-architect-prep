import { useEffect, useRef, useState } from "react";

export interface UseCountdownOptions {
  /** 初始秒数 */
  initialSeconds: number;
  /** 是否正在倒计时 */
  running: boolean;
  /** 倒计时归零时的回调（仅触发一次） */
  onExpire?: () => void;
}

/**
 * 健壮的倒计时 Hook：
 * - StrictMode 安全：仅维护一个 interval，cleanup 会取消它
 * - onExpireRef 始终指向最新的 onExpire（避免闭包过期）
 * - expiredRef 防止 onExpire 触发重渲染后重复执行
 * - running=false 时暂停计时，保留剩余时间
 * - 外部传入新的 initialSeconds 时自动同步（未过期前）
 */
export function useCountdown(opts: UseCountdownOptions): {
  remaining: number;
  reset: (next?: number) => void;
} {
  const { initialSeconds, running, onExpire } = opts;
  const [remaining, setRemaining] = useState(initialSeconds);
  const remainingRef = useRef(initialSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // 外部 initialSeconds 变化时同步（例如服务端同步）
  useEffect(() => {
    if (expiredRef.current) return;
    remainingRef.current = initialSeconds;
    setRemaining(initialSeconds);
    expiredRef.current = false;
  }, [initialSeconds]);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setInterval(() => {
      const next = remainingRef.current - 1;
      if (next <= 0) {
        remainingRef.current = 0;
        setRemaining(0);
        window.clearInterval(id);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current?.();
        }
        return;
      }
      remainingRef.current = next;
      setRemaining(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, remaining <= 0]);

  const reset = (next?: number): void => {
    const value = next ?? initialSeconds;
    remainingRef.current = value;
    expiredRef.current = false;
    setRemaining(value);
  };

  return { remaining, reset };
}

export default useCountdown;
