import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ContentEditor to prevent SSR issues
const ContentEditor = dynamic(
  () => import('@shared-lib').then((mod) => mod.ContentEditor),
  {
    ssr: false,
    loading: () => <div>Loading editor...</div>,
  }
);

const ResourseEditor = () => {
  return <ContentEditor />;
};

export default ResourseEditor;
