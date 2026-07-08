export function buildVerificationCodeEmail(code: string): string {
  const title = "ArchPrep 登录验证码";
  const brandColor = "#2563eb";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background: ${brandColor}; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }
    .body { padding: 32px 24px; color: #1f2937; }
    .body p { margin: 0 0 16px; line-height: 1.6; font-size: 15px; }
    .code-box { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code { font-family: "SF Mono", Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; color: ${brandColor}; letter-spacing: 4px; }
    .hint { color: #6b7280; font-size: 13px; margin-top: 16px; }
    .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ArchPrep</h1>
    </div>
    <div class="body">
      <p>您好，</p>
      <p>您正在登录 ArchPrep（系统架构设计师备考系统）。请使用以下验证码完成验证：</p>
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <p class="hint">验证码 5 分钟内有效。如非您本人操作，请忽略此邮件。</p>
    </div>
    <div class="footer">
      <p>ArchPrep · 系统架构设计师备考系统</p>
    </div>
  </div>
</body>
</html>`;
}
