interface Window {
  config: any;
  context: any;
  redirectUrl: any;
  $: typeof import('jquery');
  jQuery: typeof import('jquery');
  questionListUrl: string;
  parent: Window & typeof globalThis;
  [key: string]: any; // Allow index access
}

declare module '*.json' {
  const sample: any;
  export default sample;
}

declare const iziToast: any;

interface JQuery {
  iziModal(options?: any): JQuery;
  iziModal(action: string): JQuery;
  DataTable(options?: any): JQuery;
}
