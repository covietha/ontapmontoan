import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', inline = false }) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Split text by display math ($$...$$) and inline math ($...$)
    // Regex matches $$...$$ or $...$
    const parts: { type: 'text' | 'inline' | 'display'; text: string }[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      // Check display math first
      const displayStart = remaining.indexOf('$$');
      const inlineStart = remaining.indexOf('$');

      if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
        if (displayStart > 0) {
          parts.push({ type: 'text', text: remaining.substring(0, displayStart) });
        }
        const displayEnd = remaining.indexOf('$$', displayStart + 2);
        if (displayEnd !== -1) {
          parts.push({
            type: 'display',
            text: remaining.substring(displayStart + 2, displayEnd),
          });
          remaining = remaining.substring(displayEnd + 2);
        } else {
          parts.push({ type: 'text', text: remaining.substring(displayStart) });
          break;
        }
      } else if (inlineStart !== -1) {
        if (inlineStart > 0) {
          parts.push({ type: 'text', text: remaining.substring(0, inlineStart) });
        }
        const inlineEnd = remaining.indexOf('$', inlineStart + 1);
        if (inlineEnd !== -1) {
          parts.push({
            type: 'inline',
            text: remaining.substring(inlineStart + 1, inlineEnd),
          });
          remaining = remaining.substring(inlineEnd + 1);
        } else {
          parts.push({ type: 'text', text: remaining.substring(inlineStart) });
          break;
        }
      } else {
        parts.push({ type: 'text', text: remaining });
        break;
      }
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        // preserve line breaks
        return (
          <span key={index}>
            {part.text.split('\n').map((line, lineIdx, arr) => (
              <React.Fragment key={lineIdx}>
                {line}
                {lineIdx < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      }

      const isDisplay = part.type === 'display';
      // Automatically enhance fractions to \dfrac for generous spacing and crisp presentation
      const processedMath = part.text.replace(/\\frac(?![a-zA-Z])/g, '\\dfrac');
      try {
        const html = katex.renderToString(processedMath, {
          displayMode: isDisplay,
          throwOnError: false,
          output: 'html',
          strict: false,
        });
        return (
          <span
            key={index}
            className={isDisplay ? 'block my-2 overflow-x-auto text-center' : 'inline-block mx-0.5 align-middle'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return (
          <code key={index} className="bg-amber-100 text-amber-900 px-1 rounded text-sm">
            {part.text}
          </code>
        );
      }
    });
  }, [content]);

  const Tag = inline ? 'span' : 'div';

  return <Tag className={`math-content ${className}`}>{renderedContent}</Tag>;
};

export default MathRenderer;
