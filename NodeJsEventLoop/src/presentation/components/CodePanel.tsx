import { useEffect, useRef } from "react";

interface CodePanelProps {
  readonly activeLineNumber: number;
  readonly sourceCode: readonly string[];
  readonly followActiveLine?: boolean;
}

const DISPLAY_INDENTATION_SIZE = 4;
const SOURCE_INDENTATION_SIZE = 2;

const formatCodeLineForDisplay = (line: string): string => {
  const leadingWhitespace = /^ */u.exec(line)?.[0].length ?? 0;
  const indentationLevel = Math.floor(leadingWhitespace / SOURCE_INDENTATION_SIZE);
  const remainingWhitespace = leadingWhitespace % SOURCE_INDENTATION_SIZE;
  const displayIndentation = " ".repeat(indentationLevel * DISPLAY_INDENTATION_SIZE + remainingWhitespace);

  return `${displayIndentation}${line.slice(leadingWhitespace)}`;
};

export const CodePanel = ({ activeLineNumber, sourceCode, followActiveLine = false }: CodePanelProps): React.JSX.Element => {
  const codeRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const container = codeRef.current;
    const activeLine = container?.querySelector(".code-line.active");
    if (!followActiveLine || !container || !activeLine) return;
    const lineBounds = activeLine.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();
    if (lineBounds.top < containerBounds.top || lineBounds.bottom > containerBounds.bottom) {
      container.scrollTo({ top: container.scrollTop + lineBounds.top - containerBounds.top - container.clientHeight / 2 + lineBounds.height / 2, behavior: "instant" });
    }
  }, [activeLineNumber, sourceCode, followActiveLine]);
  return (
  <section className="panel code-panel" aria-label="Source code">
    <div className="panel-header">
      <span className="status-dot" aria-hidden="true" />
      <h3>main.js</h3>
    </div>
    <pre ref={codeRef}>
      <code>
        {sourceCode.map((line, index) => {
          const lineNumber = index + 1;
          const isActive = lineNumber === activeLineNumber;
          const displayLine = formatCodeLineForDisplay(line);

          return (
            <span className={isActive ? "code-line active" : "code-line"} key={`${String(lineNumber)}-${line}`}>
              <span className="line-number">{lineNumber}</span>
              <span className="code-source">{displayLine}</span>
            </span>
          );
        })}
      </code>
    </pre>
  </section>
  );
};
