import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import QuestionSet to prevent SSR issues
const QuestionSet = dynamic(
  () => import('@shared-lib').then((mod) => mod.QuestionSet),
  {
    ssr: false,
    loading: () => <div>Loading editor...</div>,
  }
);

const Editor = () => {
  return <QuestionSet />;
};

export default Editor;
