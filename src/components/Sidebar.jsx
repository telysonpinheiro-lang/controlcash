import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import useEmpresaConfig from '../hooks/useEmpresaConfig'

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconSales = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)
const IconPagar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
)
const IconReceber = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)
const IconContratos = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>
)
const IconCadastros = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconAdmin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93A10 10 0 115.07 19.07M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IconConfig = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93A10 10 0 115.07 19.07M19.07 4.93l-1.41 1.41"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
  </svg>
)
const IconLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

const IconEstoque = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IconRelatorio = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

export default function Sidebar({ notificationBell }) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const { logo, nome } = useEmpresaConfig()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItem = ({ isActive }) => `nav-item${isActive ? ' active' : ''}`

  function navClick() { setMobileOpen(false) }

  return (
    <>
    {/* Mobile topbar */}
    <div className="mobile-topbar">
      <button className="mobile-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:22,height:22}}>
          {mobileOpen
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
          }
        </svg>
      </button>
      <div className="mobile-topbar-brand">
        <div className="sidebar-brand-icon" style={{ width: 28, height: 28 }}>
          <IconLogo />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple-d)' }}>ControlCA$H</span>
      </div>
      <div className="mobile-topbar-right">
        {notificationBell}
      </div>
    </div>

    {/* Mobile overlay menu */}
    {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />}

    <div className={`mobile-drawer${mobileOpen ? ' open' : ''}`}>
      <nav className="mobile-drawer-nav">
        <div className="nav-section">Principal</div>
        <NavLink to="/dashboard" className={navItem} onClick={navClick}><IconDashboard /> Dashboard</NavLink>
        <NavLink to="/vendas" className={navItem} onClick={navClick}><IconSales /> Vendas</NavLink>

        <div className="nav-section">Financeiro</div>
        {['empresa','admin'].includes(currentUser?.plano) && (
          <NavLink to="/pagar" className={navItem} onClick={navClick}><IconPagar /> Contas a Pagar</NavLink>
        )}
        <NavLink to="/receber" className={navItem} onClick={navClick}><IconReceber /> Contas a Receber</NavLink>

        <div className="nav-section">Gestão</div>
        <NavLink to="/cadastros" className={navItem} onClick={navClick}><IconCadastros /> Cadastros</NavLink>
        {['profissional','empresa','admin'].includes(currentUser?.plano) && (
          <NavLink to="/contratos" className={navItem} onClick={navClick}><IconContratos /> Contratos</NavLink>
        )}
        {['profissional','empresa','admin'].includes(currentUser?.plano) && (
          <NavLink to="/estoque" className={navItem} onClick={navClick}><IconEstoque /> Estoque</NavLink>
        )}
        {['empresa','admin'].includes(currentUser?.plano) && (
          <NavLink to="/relatorios" className={navItem} onClick={navClick}><IconRelatorio /> Inadimplência</NavLink>
        )}

        {currentUser?.role === 'admin' && currentUser?.plano === 'admin' && (
          <>
            <div className="nav-section">Administração</div>
            <NavLink to="/admin" end className={navItem} onClick={navClick}><IconAdmin /> Clientes do Sistema</NavLink>
            <NavLink to="/admin/financeiro" className={navItem} onClick={navClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:16,height:16}}>
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Financeiro SaaS
            </NavLink>
          </>
        )}

        <div className="nav-section">Sistema</div>
        <NavLink to="/configuracoes" className={navItem} onClick={navClick}><IconConfig /> Configurações</NavLink>
      </nav>

      <div className="mobile-drawer-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: 'var(--bg3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {logo
              ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <IconLogo />
            }
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
            <div style={{ fontSize: 9, color: 'var(--text-xs)' }}>{currentUser?.nome}</div>
          </div>
        </div>
        <button className="sidebar-footer-btn" onClick={handleLogout} style={{ marginLeft: 'auto' }}>
          <IconLogout /> Sair
        </button>
      </div>
    </div>

    {/* Desktop sidebar */}
    <div className="sidebar sidebar-desktop">
      <div className="sidebar-brand">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-icon">
            <IconLogo />
          </div>
          <div>
            <div className="sidebar-brand-name">ControlCA$H</div>
            <div className="sidebar-brand-tag">by Virtual Core</div>
          </div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-user-name">{currentUser?.nome}</div>
        <div className="sidebar-user-role">
          {currentUser?.plano === 'admin'        ? 'Administrador · ControlCA$H'
            : currentUser?.plano === 'empresa'     ? 'Plano Empresa'
            : currentUser?.plano === 'profissional' ? 'Plano Profissional'
            : 'Plano Essencial'}
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* ── Principal — todos os planos ── */}
        <div className="nav-section">Principal</div>
        <NavLink to="/dashboard" className={navItem}>
          <IconDashboard /> Dashboard
        </NavLink>
        <NavLink to="/vendas" className={navItem}>
          <IconSales /> Vendas
        </NavLink>

        {/* ── Financeiro ── */}
        <div className="nav-section">Financeiro</div>
        {['empresa','admin'].includes(currentUser?.plano ?? currentUser?.role) && (
          <NavLink to="/pagar" className={navItem}>
            <IconPagar /> Contas a Pagar
          </NavLink>
        )}
        <NavLink to="/receber" className={navItem}>
          <IconReceber /> Contas a Receber
        </NavLink>

        {/* ── Gestão ── */}
        <div className="nav-section">Gestão</div>
        <NavLink to="/cadastros" className={navItem}>
          <IconCadastros /> Cadastros
        </NavLink>
        {['profissional','empresa','admin'].includes(currentUser?.plano ?? currentUser?.role) && (
          <NavLink to="/contratos" className={navItem}>
            <IconContratos /> Contratos
          </NavLink>
        )}
        {['profissional','empresa','admin'].includes(currentUser?.plano ?? currentUser?.role) && (
          <NavLink to="/estoque" className={navItem}>
            <IconEstoque /> Estoque
          </NavLink>
        )}
        {['empresa','admin'].includes(currentUser?.plano ?? currentUser?.role) && (
          <NavLink to="/relatorios" className={navItem}>
            <IconRelatorio /> Inadimplência
          </NavLink>
        )}

        {/* ── Administração — só plano admin ── */}
        {currentUser?.role === 'admin' && currentUser?.plano === 'admin' && (
          <>
            <div className="nav-section">Administração</div>
            <NavLink to="/admin" end className={navItem}>
              <IconAdmin /> Clientes do Sistema
            </NavLink>
            <NavLink to="/admin/financeiro" className={navItem}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:16,height:16}}>
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Financeiro SaaS
            </NavLink>
          </>
        )}

        <div className="nav-section">Sistema</div>
        <NavLink to="/configuracoes" className={navItem}>
          <IconConfig /> Configurações
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {/* Empresa + Notificação */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 4px', marginBottom: 6,
          borderTop: '1px solid var(--border)', paddingTop: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'var(--bg3)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {logo
              ? <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <IconLogo />
            }
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nome}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-xs)', letterSpacing: '.05em' }}>Sua empresa</div>
          </div>
          {notificationBell}
        </div>

        <div className="sidebar-footer-btn" onClick={handleLogout}>
          <IconLogout /> Sair
        </div>
      </div>
    </div>
    </>
  )
}
