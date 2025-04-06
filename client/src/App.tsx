function App() {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      fontFamily: 'sans-serif', 
      textAlign: 'center' 
    }}>
      <h1 style={{ color: '#0066ff', fontSize: '32px', marginBottom: '20px' }}>
        gHosted - Basic Test
      </h1>
      <p style={{ marginBottom: '20px', fontSize: '16px' }}>
        This is a basic test to check if React rendering is working at all.
      </p>
      <div style={{ 
        padding: '20px', 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        background: '#f8f9fa',
        marginBottom: '20px'
      }}>
        <p>Current time: {new Date().toLocaleTimeString()}</p>
      </div>
      <button 
        style={{ 
          padding: '10px 20px', 
          background: '#0066ff', 
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
        onClick={() => {
          alert('Button clicked!');
        }}
      >
        Click Me
      </button>
    </div>
  );
}

export default App;
