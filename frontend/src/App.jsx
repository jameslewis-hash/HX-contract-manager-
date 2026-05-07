import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContractList from './pages/ContractList';
import ContractDetail from './pages/ContractDetail';
import ContractForm from './pages/ContractForm';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contracts" element={<ContractList />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/contracts/:id/edit" element={<ContractForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
