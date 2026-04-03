import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import NotificationBell from './components/NotificationBell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vendas from './pages/Vendas'
import Pagar from './pages/Pagar'
import Receber from './pages/Receber'
import Contratos from './pages/Contratos'
import Cadastros from './pages/Cadastros'
import Estoque from './pages/Estoque'
import Relatorios from './pages/Relatorios'
import Admin from './pages/Admin'
import AdminFinanceiro from './pages/AdminFinanceiro'
import Configuracoes from './pages/Configuracoes'
import './styles/global.css'

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--bg)',fontFamily:'Outfit,sans-serif' }}>
          <div style={{ textAlign:'center',padding:40,maxWidth:420 }}>
            <div style={{ fontSize:48,marginBottom:16 }}>:(</div>
            <h2 style={{ color:'var(--purple-d)',marginBottom:8 }}>Algo deu errado</h2>
            <p style={{ color:'var(--text-s)',fontSize:14,marginBottom:20 }}>{this.state.error?.message || 'Erro inesperado na aplicação.'}</p>
            <button onClick={() => { this.setState({ hasError:false,error:null }); window.location.href='/dashboard' }}
              style={{ padding:'10px 24px',background:'var(--purple)',color:'#fff',border:'none',borderRadius:10,cursor:'pointer',fontFamily:'Outfit',fontWeight:600 }}>
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppLayout() {
  return (
    <div id="app" style={{ display: 'block' }}>
      <div className="app-wrap">
        <Sidebar notificationBell={<NotificationBell />} />
        <div className="main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  return <AppLayout />
}

function AdminRoute() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (currentUser.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function PublicRoute() {
  const { currentUser } = useAuth()
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/vendas" element={<Vendas />} />
                <Route path="/pagar" element={<Pagar />} />
                <Route path="/receber" element={<Receber />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/cadastros" element={<Cadastros />} />
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
                </Route>
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Toast />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
