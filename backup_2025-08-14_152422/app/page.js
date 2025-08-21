"use client";

import { useState } from "react";

export default function MinimalPage() {
  const [message, setMessage] = useState("Test Page");

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>CV Review App - Minimal Test</h1>
      <p>{message}</p>
      <button 
        onClick={() => setMessage("Button clicked!")}
        style={{ padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
      >
        Test Button
      </button>
    </div>
  );
}