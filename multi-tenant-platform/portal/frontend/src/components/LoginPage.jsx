import { login } from '../keycloak';

export default function LoginPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <h1 style={styles.logoText}>n8n</h1>
          <p style={styles.subtitle}>Multi-Tenant Platform</p>
        </div>

        <div style={styles.content}>
          <h2 style={styles.title}>Welcome</h2>
          <p style={styles.description}>
            Get your own dedicated n8n instance with complete data isolation.
            Sign in with Keycloak to get started.
          </p>

          <button onClick={login} style={styles.loginButton}>
            Sign In with Keycloak
          </button>
        </div>

        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🔒</span>
            <div>
              <strong>Secure</strong>
              <p style={styles.featureText}>OAuth2/OIDC authentication</p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>🗄️</span>
            <div>
              <strong>Isolated</strong>
              <p style={styles.featureText}>Dedicated database per user</p>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>⚡</span>
            <div>
              <strong>On-Demand</strong>
              <p style={styles.featureText}>Instances created automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  logo: {
    backgroundColor: '#EA4B71',
    color: 'white',
    padding: '40px 20px',
    textAlign: 'center',
  },
  logoText: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: 0,
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '16px',
    margin: '10px 0 0',
    opacity: 0.9,
  },
  content: {
    padding: '40px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    marginBottom: '16px',
    color: '#333',
  },
  description: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '30px',
  },
  loginButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#EA4B71',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
  },
  features: {
    borderTop: '1px solid #eee',
    padding: '30px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  feature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  featureIcon: {
    fontSize: '32px',
  },
  featureText: {
    color: '#666',
    fontSize: '14px',
    margin: '4px 0 0',
  },
};
