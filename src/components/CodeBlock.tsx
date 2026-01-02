import React, { useState, useCallback, memo } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Simple syntax highlighting
const highlightCode = (code: string, language: string): React.ReactNode => {
  if (!code) return code;
  
  // Keywords for common languages
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'implements', 'interface', 'type', 'enum', 'public', 'private', 'protected', 'static', 'readonly', 'abstract', 'def', 'print', 'elif', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'with', 'as', 'pass', 'break', 'continue', 'global', 'nonlocal', 'raise', 'yield', 'assert', 'del', 'except', 'finally', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  
  const lines = code.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Process each line
    let parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Check for comments
    const singleLineCommentMatch = line.match(/\/\/.*$|#.*$/);
    const multiLineCommentMatch = line.match(/\/\*.*\*\//);
    
    // Check for strings
    const stringRegex = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
    const numberRegex = /\b\d+\.?\d*\b/g;
    
    // Create keyword regex
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    
    // Simple tokenization
    let remainingLine = line;
    let tokens: { type: string; value: string; index: number }[] = [];
    
    // Find all matches
    let match;
    
    // Comments
    if (singleLineCommentMatch) {
      const commentStart = line.indexOf(singleLineCommentMatch[0]);
      tokens.push({ type: 'comment', value: singleLineCommentMatch[0], index: commentStart });
    }
    
    // Strings
    const stringMatches = [...line.matchAll(stringRegex)];
    stringMatches.forEach(m => {
      if (m.index !== undefined) {
        tokens.push({ type: 'string', value: m[0], index: m.index });
      }
    });
    
    // Numbers
    const numberMatches = [...line.matchAll(numberRegex)];
    numberMatches.forEach(m => {
      if (m.index !== undefined) {
        // Check if this number is inside a string
        const isInString = stringMatches.some(s => 
          s.index !== undefined && m.index !== undefined &&
          m.index >= s.index && m.index < s.index + s[0].length
        );
        if (!isInString) {
          tokens.push({ type: 'number', value: m[0], index: m.index });
        }
      }
    });
    
    // Keywords
    const keywordMatches = [...line.matchAll(keywordRegex)];
    keywordMatches.forEach(m => {
      if (m.index !== undefined) {
        // Check if this keyword is inside a string or comment
        const isInString = stringMatches.some(s => 
          s.index !== undefined && m.index !== undefined &&
          m.index >= s.index && m.index < s.index + s[0].length
        );
        const isInComment = singleLineCommentMatch && 
          m.index >= line.indexOf(singleLineCommentMatch[0]);
        if (!isInString && !isInComment) {
          tokens.push({ type: 'keyword', value: m[0], index: m.index });
        }
      }
    });
    
    // Sort tokens by index
    tokens.sort((a, b) => a.index - b.index);
    
    // Build the line with highlighted tokens
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    
    tokens.forEach((token, i) => {
      // Add text before this token
      if (token.index > lastIndex) {
        result.push(
          <span key={`text-${lineIndex}-${i}`}>
            {line.slice(lastIndex, token.index)}
          </span>
        );
      }
      
      // Add the token with appropriate styling
      const className = 
        token.type === 'keyword' ? 'code-keyword' :
        token.type === 'string' ? 'code-string' :
        token.type === 'number' ? 'code-number' :
        token.type === 'comment' ? 'code-comment' :
        '';
      
      result.push(
        <span key={`token-${lineIndex}-${i}`} className={className}>
          {token.value}
        </span>
      );
      
      lastIndex = token.index + token.value.length;
    });
    
    // Add remaining text
    if (lastIndex < line.length) {
      result.push(
        <span key={`end-${lineIndex}`}>
          {line.slice(lastIndex)}
        </span>
      );
    }
    
    return (
      <div key={lineIndex}>
        {result.length > 0 ? result : line || '\n'}
      </div>
    );
  });
};

const CodeBlock = memo(({ code, language = 'text' }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  }, [code]);

  const displayLanguage = language.toLowerCase().replace(/^language-/, '');

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-language">{displayLanguage}</span>
        <button 
          onClick={handleCopy}
          className="code-block-copy"
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="code-block-content">
        <code>{highlightCode(code, displayLanguage)}</code>
      </div>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

export default CodeBlock;
