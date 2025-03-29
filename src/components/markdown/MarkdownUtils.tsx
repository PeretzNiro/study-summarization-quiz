import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Determines if content should be treated as markdown or kept as plain text
 * Standalone markdown symbols will not trigger markdown rendering
 * @param content - The content to check
 * @returns true if the content contains valid markdown elements, false otherwise
 */
export const shouldRenderAsMarkdown = (content: string): boolean => {
  if (!content) return false;
  
  // Special case: if content is just a single markdown character or very short, don't render as markdown
  // This handles cases like "#" or "##" or "$" or ">" as standalone answers
  if (/^[#$>`*_~]+$/.test(content.trim()) || content.trim() === '```') {
    return false;
  }
  
  // Check if content is extremely short but contains markdown symbols
  // If very short (less than 3 chars) and contains markdown symbols, it's likely not intended as markdown
  if (content.trim().length < 3 && /[#$>`*_~]/.test(content)) {
    return false;
  }
  
  // Patterns for different markdown elements that we want to detect
  // Each pattern is designed to require proper formatting, not just the symbol
  const patterns = [
    // Code blocks - must have content between the backticks
    /```[a-z]*\s[\s\S]+```/,
    
    // Inline code - must have content between the backticks
    /`[^`]+`/,
    
    // Math blocks - must have content between the dollars
    /\$\$[\s\S]+?\$\$/,
    
    // Inline math - must have content between the dollars
    /\$[^\$\n]+\$/,
    
    // Links - must have both text and URL portions
    /\[[^\]]+\]\([^\)]+\)/,
    
    // Images - must have both alt text and URL
    /!\[[^\]]*\]\([^\)]+\)/,
    
    // HTML tables or images - must have closing tags or attributes
    /<(table|img)[\s\S]*?>[\s\S]*?(<\/\1>|>)/i,
    
    // Headers - must have text after the # (not just the # symbol)
    /^#{1,6}\s+\S+/m,
    
    // Lists - must have text after the bullet
    /^[*\-+]\s+\S+/m,
    /^\d+\.\s+\S+/m,
    
    // Horizontal rule - must be proper format
    /^-{3,}$/m,
    
    // Blockquotes - must have text after the >
    /^>\s+\S+/m,
    
    // Bold - must have content between asterisks
    /\*\*[^*\s][^*]*[^*\s]\*\*/,
    
    // Italic - must have content between asterisks
    /\*[^*\s][^*]*[^*\s]\*/,
    
    // Bold with underscores - must have content
    /__[^_\s][^_]*[^_\s]__/,
    
    // Italic with underscores - must have content
    /_[^_\s][^_]*[^_\s]_/
  ];
  
  // Test if any pattern matches the content
  return patterns.some(pattern => pattern.test(content));
};

/**
 * Creates a reusable markdown component configuration with syntax highlighting
 * @returns The markdown component configuration object
 */
export const getMarkdownComponents = () => {
  return {
    table: ({ node, children, ...props }: any) => (
      <div className="table-wrapper">
        <table {...props}>{children}</table>
      </div>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            borderRadius: '8px'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };
};

// Empty component to make TypeScript happy with the .tsx extension
const MarkdownUtils: React.FC = () => null;
export default MarkdownUtils;