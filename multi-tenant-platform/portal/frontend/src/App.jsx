import { useState, useEffect } from 'react';
import { initKeycloak, isAuthenticated, getUserProfile } from './keycloak';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      const auth = await initKeycloak();
      setAuthenticated(auth);

      if (auth) {
        const profile = await getUserProfile();
        setUser(profile);
      }
    } catch (error) {
      console.error('Initialization failed:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Initializing...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <Dashboard user={user} />;
}

const styles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #EA4B71',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
};
