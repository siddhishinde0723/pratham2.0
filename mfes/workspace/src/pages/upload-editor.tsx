import React from 'react';
import dynamic from 'next/dynamic';

// Try using a more compatible dynamic import syntax
const GenericEditor = dynamic(
  () =>
    import('@shared-lib').then((mod) => {
      console.log('Dynamic import mod:', mod);
      return mod.GenericEditor;
    }),
  {
    ssr: false,
    loading: () => <div>Loading editor...</div>,
  }
);

const UploadEditor = () => {
  return <GenericEditor />;
};

export default UploadEditor;
