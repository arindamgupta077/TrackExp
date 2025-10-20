// Simple test version of App component to debug white screen issue
import React from 'react';

const AppTest = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🧪 App Test - White Screen Debug</h1>
      <div style={{ marginTop: '20px' }}>
        <p>✅ If you can see this, React is working</p>
        <p>✅ JavaScript is executing</p>
        <p>✅ Vite server is serving the content</p>
      </div>
      
      <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #444' }}>
        <h2>Debug Information:</h2>
        <p>• Timestamp: {new Date().toLocaleString()}</p>
        <p>• React Version: {React.version}</p>
        <p>• Environment: {import.meta.env.MODE}</p>
      </div>
    </div>
  );
};

export default AppTest;
