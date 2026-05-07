import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px 12px 44px',
    background: '#2a1a4e',
    border: '1px solid #3d2870',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nunito, sans-serif',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a0a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(84,46,145,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(84,46,145,0.2) 0%, transparent 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 60,
            height: 60,
            background: '#542E91',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 22,
            color: '#FDDC06',
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(84,46,145,0.5)',
          }}>HX</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            Contract Manager
          </h1>
          <p style={{ color: '#b0a0cc', fontSize: 14 }}>
            Holiday Extras &mdash; sign in to continue
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#231540',
          border: '1px solid #3d2870',
          borderRadius: 16,
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                color: '#ef4444',
                fontSize: 13,
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#b0a0cc', marginBottom: 6 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7060a0' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@holidayextras.com"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#542E91'}
                  onBlur={e => e.target.style.borderColor = '#3d2870'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#b0a0cc', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#7060a0' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#542E91'}
                  onBlur={e => e.target.style.borderColor = '#3d2870'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#3d2870' : '#542E91',
                color: '#FDDC06',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 800,
                transition: 'all 0.15s',
                letterSpacing: '0.02em',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#6B3CB5'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#542E91'; }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 24,
            padding: '14px',
            background: 'rgba(84,46,145,0.15)',
            border: '1px solid #3d2870',
            borderRadius: 8,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7060a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Demo accounts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button
                onClick={() => { setEmail('admin@holidayextras.com'); setPassword('editor123'); }}
                style={{ background: 'none', color: '#b0a0cc', fontSize: 12, textAlign: 'left', padding: '2px 0', cursor: 'pointer' }}
              >
                <span style={{ color: '#FDDC06', fontWeight: 700 }}>Editor:</span> admin@holidayextras.com / editor123
              </button>
              <button
                onClick={() => { setEmail('viewer@holidayextras.com'); setPassword('viewer123'); }}
                style={{ background: 'none', color: '#b0a0cc', fontSize: 12, textAlign: 'left', padding: '2px 0', cursor: 'pointer' }}
              >
                <span style={{ color: '#b0a0cc', fontWeight: 700 }}>Viewer:</span> viewer@holidayextras.com / viewer123
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
