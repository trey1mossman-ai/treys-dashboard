export default function TestPage() {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#f0f4ff'
    }}>
      <h1 style={{ marginBottom: '20px' }}>Test Page - Site is Loading!</h1>
      <p>This is a simple test page to verify the site loads correctly.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}