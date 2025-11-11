import { useState, useEffect } from 'react';
import { getOrCreateInstance, getInstanceStatus, deleteInstance } from '../api';
import { logout } from '../keycloak';

export default function Dashboard({ user }) {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkInstance();
  }, []);

  async function checkInstance() {
    try {
      setLoading(true);
      setError(null);
      const status = await getInstanceStatus();

      if (status.exists) {
        setInstance({
          url: status.url,
          status: status.status,
          createdAt: status.createdAt,
        });
      }
    } catch (err) {
      console.error('Error checking instance:', err);
      setError('Failed to check instance status');
    } finally {
      setLoading(false);
    }
  }

  async function handleLaunchInstance() {
    try {
      setLoading(true);
      setError(null);
      const result = await getOrCreateInstance();

      setInstance({
        url: result.url,
        status: result.status,
        createdAt: result.instance.createdAt,
      });
    } catch (err) {
      console.error('Error launching instance:', err);
      setError('Failed to launch n8n instance');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteInstance() {
    if (!confirm('Are you sure you want to delete your n8n instance? All workflows and data will be lost.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await deleteInstance();
      setInstance(null);
      alert('Instance deleted successfully');
    } catch (err) {
      console.error('Error deleting instance:', err);
      setError('Failed to delete instance');
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenInstance() {
    if (instance?.url) {
      window.open(instance.url, '_blank');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>n8n Multi-Tenant Platform</h1>
        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Welcome, {user.name || user.username}!</h2>
        <p style={styles.email}>{user.email}</p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <p>Loading...</p>
          </div>
        ) : instance ? (
          <div style={styles.instanceInfo}>
            <div style={styles.statusBadge}>
              Instance Status: <strong>{instance.status}</strong>
            </div>

            <div style={styles.instanceUrl}>
              <strong>Your n8n Instance:</strong>
              <a href={instance.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                {instance.url}
              </a>
            </div>

            {instance.createdAt && (
              <p style={styles.createdAt}>
                Created: {new Date(instance.createdAt).toLocaleString()}
              </p>
            )}

            <div style={styles.buttonGroup}>
              <button
                onClick={handleOpenInstance}
                style={styles.primaryButton}
                disabled={instance.status !== 'running'}
              >
                Open My n8n Instance
              </button>

              <button
                onClick={handleDeleteInstance}
                style={styles.dangerButton}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Instance'}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.noInstance}>
            <p style={styles.noInstanceText}>
              You don't have an n8n instance yet. Click below to create your personal n8n instance.
            </p>
            <button
              onClick={handleLaunchInstance}
              style={styles.primaryButton}
            >
              Create My n8n Instance
            </button>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Each user gets a dedicated n8n instance with isolated data and workflows.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '800px',
    margin: '0 auto 30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '24px',
    marginBottom: '8px',
    color: '#333',
  },
  email: {
    color: '#666',
    marginBottom: '30px',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #fcc',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #EA4B71',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  instanceInfo: {
    marginTop: '20px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: '#e7f7e7',
    color: '#2d7a2d',
    borderRadius: '20px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  instanceUrl: {
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  link: {
    color: '#EA4B71',
    textDecoration: 'none',
    marginLeft: '10px',
    fontFamily: 'monospace',
  },
  createdAt: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '20px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#EA4B71',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    flex: 1,
  },
  dangerButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  noInstance: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  noInstanceText: {
    color: '#666',
    marginBottom: '24px',
    fontSize: '16px',
  },
  footer: {
    maxWidth: '800px',
    margin: '30px auto 0',
    textAlign: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: '14px',
  },
};
