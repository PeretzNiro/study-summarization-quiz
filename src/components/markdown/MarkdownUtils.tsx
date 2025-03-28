import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Determines if content should be treated as markdown
 * @param content - The content to check
 * @returns true if the content contains markdown elements, false otherwise
 */
export const shouldRenderAsMarkdown = (content: string): boolean => {
  if (!content) return false;
  
  // Patterns for different markdown elements
  const patterns = [
    // Code blocks with language specification
    /```[a-z]+[\s\S]*?```/,
    
    // General code blocks
    /```[\s\S]*?```/,
    
    // Inline code
    /`[^`]+`/,
    
    // Math blocks
    /\$\$[\s\S]*?\$\$/,
    
    // Inline math
    /\$[^\$\n]+\$/,
    
    // Links
    /\[.+?\]\(.+?\)/,
    
    // Images
    /!\[.+?\]\(.+?\)/,
    
    // HTML tables or images
    /<(table|img)[\s\S]*?>/i,
    
    // Headers (# followed by space)
    /^#{1,6}\s.+/m,
    
    // Lists (ordered or unordered)
    /^[*\-+]\s.+/m,
    /^\d+\.\s.+/m,
    
    // Horizontal rule
    /^---+$/m,
    
    // Blockquotes
    /^>\s.+/m
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