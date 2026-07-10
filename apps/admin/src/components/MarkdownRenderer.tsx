import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

const proseClasses = [
  "prose",
  "prose-sm",
  "max-w-none",
  "dark:prose-invert",
  "prose-headings:scroll-mt-20",
  "prose-headings:font-semibold",
  "prose-headings:text-foreground",
  "prose-h1:text-2xl",
  "prose-h1:font-bold",
  "prose-h1:mb-4",
  "prose-h2:text-xl",
  "prose-h2:font-semibold",
  "prose-h2:mt-6",
  "prose-h2:mb-3",
  "prose-h2:border-b",
  "prose-h2:border-border",
  "prose-h2:pb-1",
  "prose-h3:text-lg",
  "prose-h3:font-semibold",
  "prose-h3:mt-4",
  "prose-h3:mb-2",
  "prose-p:text-foreground",
  "prose-p:leading-relaxed",
  "prose-p:mb-4",
  "prose-a:text-primary",
  "prose-a:underline",
  "prose-strong:font-semibold",
  "prose-strong:text-foreground",
  "prose-ul:my-4",
  "prose-ul:list-disc",
  "prose-ul:pl-6",
  "prose-ol:my-4",
  "prose-ol:list-decimal",
  "prose-ol:pl-6",
  "prose-li:mb-1",
  "prose-table:w-full",
  "prose-table:border-collapse",
  "prose-table:my-4",
  "prose-thead:bg-muted",
  "prose-th:border",
  "prose-th:border-border",
  "prose-th:px-3",
  "prose-th:py-2",
  "prose-th:text-left",
  "prose-th:font-semibold",
  "prose-th:text-foreground",
  "prose-td:border",
  "prose-td:border-border",
  "prose-td:px-3",
  "prose-td:py-2",
  "prose-td:text-foreground",
  "prose-code:bg-muted",
  "prose-code:rounded",
  "prose-code:px-1",
  "prose-code:py-0.5",
  "prose-code:text-sm",
  "prose-code:font-mono",
  "prose-code:text-foreground",
  "prose-pre:bg-muted",
  "prose-pre:rounded-lg",
  "prose-pre:p-4",
  "prose-pre:overflow-auto",
  "prose-pre:my-4",
  "prose-pre:font-mono",
  "prose-pre:text-sm",
  "prose-blockquote:border-l-4",
  "prose-blockquote:border-primary",
  "prose-blockquote:bg-muted/50",
  "prose-blockquote:pl-4",
  "prose-blockquote:py-2",
  "prose-blockquote:my-4",
  "prose-blockquote:text-muted-foreground",
  "prose-hr:border-border",
  "prose-hr:my-6",
  "prose-sup:text-xs",
  "prose-sup:text-primary",
].join(" ");

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className={proseClasses}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children, ...props }) => {
            const childArr = Array.isArray(children) ? children : [children];
            const hasImgOnly = childArr.every(
              (c) =>
                c === null ||
                c === undefined ||
                (typeof c === "object" && "type" in c && c.type === "img"),
            );
            if (hasImgOnly) return <div {...props}>{children}</div>;
            return <p {...props}>{children}</p>;
          },
          section: (props) => {
            if (
              props.className === "footnotes" ||
              (typeof props.className === "string" && props.className.includes("footnotes"))
            ) {
              return (
                <section
                  {...props}
                  className="border-t border-border mt-6 pt-4 text-sm text-muted-foreground"
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

export { MarkdownRenderer };
