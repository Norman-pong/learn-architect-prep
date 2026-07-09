import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CSSProperties } from "react";
import { theme } from "antd";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { token } = theme.useToken();

  const styles = useMemo<Record<string, CSSProperties>>(
    () => ({
      h1: {
        fontSize: token.fontSizeHeading1,
        fontWeight: token.fontWeightStrong,
        margin: `0 0 ${token.marginMD}px`,
        color: token.colorTextHeading,
      },
      h2: {
        fontSize: token.fontSizeHeading2,
        fontWeight: token.fontWeightStrong,
        margin: `${token.marginLG}px 0 ${token.marginSM}px`,
        color: token.colorTextHeading,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        paddingBottom: token.paddingXXS,
      },
      h3: {
        fontSize: token.fontSizeHeading3,
        fontWeight: token.fontWeightStrong,
        margin: `${token.marginMD}px 0 ${token.marginXS}px`,
        color: token.colorTextHeading,
      },
      p: {
        fontSize: token.fontSize,
        lineHeight: token.lineHeightLG,
        color: token.colorText,
        margin: `0 0 ${token.marginMD}px`,
      },
      ul: {
        paddingInlineStart: token.paddingLG,
        margin: `0 0 ${token.marginMD}px`,
      },
      ol: {
        paddingInlineStart: token.paddingLG,
        margin: `0 0 ${token.marginMD}px`,
      },
      li: {
        fontSize: token.fontSize,
        lineHeight: token.lineHeightLG,
        color: token.colorText,
        marginBottom: token.marginXXS,
        "::marker": { color: token.colorPrimary },
      } as CSSProperties,
      table: {
        width: "100%",
        borderCollapse: "collapse",
        margin: `0 0 ${token.marginMD}px`,
        fontSize: token.fontSize,
      } as CSSProperties,
      thead: {
        backgroundColor: token.colorFillQuaternary,
      } as CSSProperties,
      th: {
        border: `1px solid ${token.colorBorderSecondary}`,
        padding: `${token.paddingXXS}px ${token.paddingSM}px`,
        fontWeight: token.fontWeightStrong,
        textAlign: "left" as const,
        color: token.colorTextHeading,
      },
      td: {
        border: `1px solid ${token.colorBorderSecondary}`,
        padding: `${token.paddingXXS}px ${token.paddingSM}px`,
        color: token.colorText,
        verticalAlign: "top" as const,
      },
      code: {
        backgroundColor: token.colorFillSecondary,
        borderRadius: token.borderRadiusSM,
        padding: `1px ${token.paddingXXS}px`,
        fontFamily: token.fontFamilyCode,
        fontSize: token.fontSizeSM,
        color: token.colorTextSecondary,
      },
      pre: {
        backgroundColor: token.colorFillQuaternary,
        borderRadius: token.borderRadiusLG,
        padding: token.paddingSM,
        overflow: "auto",
        margin: `0 0 ${token.marginMD}px`,
        fontFamily: token.fontFamilyCode,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightLG,
      } as CSSProperties,
      blockquote: {
        borderLeft: `4px solid ${token.colorPrimary}`,
        backgroundColor: token.colorFillQuaternary,
        padding: `${token.paddingXS}px ${token.paddingMD}px`,
        margin: `0 0 ${token.marginMD}px`,
        color: token.colorTextSecondary,
      },
      a: {
        color: token.colorPrimary,
        textDecoration: "underline",
      },
      strong: {
        fontWeight: token.fontWeightStrong,
      },
      hr: {
        border: "none",
        borderTop: `1px solid ${token.colorBorder}`,
        margin: `${token.marginLG}px 0`,
      },
      sup: {
        fontSize: token.fontSizeSM,
        color: token.colorPrimary,
      },
      footnotesSection: {
        borderTop: `1px solid ${token.colorBorder}`,
        marginTop: token.marginLG,
        paddingTop: token.paddingSM,
        fontSize: token.fontSizeSM,
        color: token.colorTextSecondary,
      },
    }),
    [token],
  );

  return (
    <div
      style={{
        fontSize: token.fontSize,
        lineHeight: token.lineHeightLG,
        color: token.colorText,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 style={styles.h1} {...props} />,
          h2: (props) => <h2 style={styles.h2} {...props} />,
          h3: (props) => <h3 style={styles.h3} {...props} />,
          p: ({ children, ...props }) => {
            const childArr = Array.isArray(children) ? children : [children];
            const hasImgOnly = childArr.every(
              (c) =>
                c === null ||
                c === undefined ||
                (typeof c === "object" && "type" in c && c.type === "img"),
            );
            if (hasImgOnly) return <div {...props}>{children}</div>;
            return (
              <p style={styles.p} {...props}>
                {children}
              </p>
            );
          },
          ul: (props) => <ul style={styles.ul} {...props} />,
          ol: (props) => <ol style={styles.ol} {...props} />,
          li: (props) => <li style={styles.li} {...props} />,
          table: (props) => <table style={styles.table} {...props} />,
          thead: (props) => <thead style={styles.thead} {...props} />,
          th: (props) => <th style={styles.th} {...props} />,
          td: (props) => <td style={styles.td} {...props} />,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code style={styles.code} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre style={styles.pre}>
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          blockquote: (props) => <blockquote style={styles.blockquote} {...props} />,
          a: (props) => <a style={styles.a} {...props} />,
          strong: (props) => <strong style={styles.strong} {...props} />,
          hr: (props) => <hr style={styles.hr} {...props} />,
          sup: (props) => <sup style={styles.sup} {...props} />,
          section: (props) => {
            if (
              props.className === "footnotes" ||
              (typeof props.className === "string" && props.className.includes("footnotes"))
            ) {
              return (
                <section
                  {...props}
                  style={{ ...styles.footnotesSection, ...(props.style as CSSProperties) }}
                />
              );
            }
            return <section {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
