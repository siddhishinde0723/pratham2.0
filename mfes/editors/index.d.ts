/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*.svg' {
  const content: any;
  export const ReactComponent: any;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}

// jQuery and iziModal type declarations
declare global {
  interface Window {
    $: any;
    jQuery: any;
    context: any;
    config: any;
    parent: Window & typeof globalThis;
    [key: string]: any; // Allow index access
  }

  interface JQuery {
    iziModal(options?: any): JQuery;
    iziModal(action: string): JQuery;
  }

  // Extend the global Window interface to allow bracket notation
  interface Window {
    [key: string]: any;
  }
}

export {};
