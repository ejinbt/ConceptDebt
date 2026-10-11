/// <reference types="vite/client" />

declare module 'react-katex' {
  import * as React from 'react';
  export interface InlineMathProps {
    math: string;
    renderError?: (error: Error | TypeError) => React.ReactNode;
  }
  export interface BlockMathProps {
    math: string;
    renderError?: (error: Error | TypeError) => React.ReactNode;
  }
  export const InlineMath: React.FC<InlineMathProps>;
  export const BlockMath: React.FC<BlockMathProps>;
}
