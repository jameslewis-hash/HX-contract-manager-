import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus } from 'lucide-react';

const navStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '11px 16px',
  borderRadius: '8px',
  color: isActive ? '#FDDC06' : '#b0a0cc',
  background: isActive ? 'rgba(253,220,6,0.08)' : 'transparent',
  fontWeight: isActive ? 700 : 500,
  fontSize: '14px',
  transition: 'all 0.15s',
  cursor: 'pointer',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid #FDDC06' : '3px solid transparent',
});

export default function Sidebar() {
  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      height: '100vh',
      background: '#231540',
      borderRight: '1px solid #3d2870',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid #3d2870',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36,
            height: 36,
            background: '#542E91',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: 14,
            color: '#FDDC06',
            letterSpacing: '-0.5px',
            flexShrink: 0,
          }}>HX</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>Contract</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#FDDC06', lineHeight: 1.2 }}>Manager</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <p style={{ fontSize: 11, color: '#7060a0', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </p>

        <NavLink to="/dashboard" style={({ isActive }) => navStyle(isActive)}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink to="/contracts" style={({ isActive }) => navStyle(isActive)} end={false}>
          <FileText size={16} />
          All Contracts
        </NavLink>

        <NavLink to="/contracts/new" style={({ isActive }) => navStyle(isActive)}>
          <FilePlus size={16} />
          Add Contract
        </NavLink>
      </nav>
    </aside>
  );
}
