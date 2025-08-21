'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      backgroundColor: '#fff0f0', 
      border: '1px solid #ffcaca',
      borderRadius: '5px'
    }}>
      <h2>Something went wrong!</h2>
      <p>The application encountered an error. Please try again later.</p>
      <button
        onClick={reset}
        style={{
          padding: '10px',
          backgroundColor: '#ff4040',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        Try again
      </button>
    </div>
  );
}
