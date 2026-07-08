import type { CORSConfig } from "@elysiajs/cors";

/**
 * 创建 ArchPrep 的 CORS 配置。
 *
 * 默认允许本机开发来源（localhost 任意端口、127.0.0.1 任意端口）。
 * 当设置了 CLOUDFLARED_DOMAIN 环境变量时，额外允许该域名通过 HTTPS 访问。
 *
 * 用法：
 *   .use(cors(createCorsConfig()))
 */
export function createCorsConfig(): CORSConfig {
  const origins: CORSConfig["origin"] = [
    /localhost/,
    /127\.0\.0\.1/,
  ];

  const cloudflaredDomain = process.env.CLOUDFLARED_DOMAIN?.trim();
  if (cloudflaredDomain) {
    const normalized = cloudflaredDomain.startsWith("https://")
      ? cloudflaredDomain
      : `https://${cloudflaredDomain}`;
    // 避免重复添加
    if (!origins.includes(normalized)) {
      origins.push(normalized);
    }
  }

  return {
    origin: origins,
    credentials: true,
  };
}
