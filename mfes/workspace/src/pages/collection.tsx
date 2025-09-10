import dynamic from 'next/dynamic';
import React from 'react';

const Collection = dynamic(
  () => import('@shared-lib').then((mod) => mod.Collection),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading editor...
      </div>
    ),
  }
);

const collection = () => {
  return <Collection />;
};

export default collection;
