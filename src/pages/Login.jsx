import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import useEmpresaConfig from '../hooks/useEmpresaConfig'

const IconLogo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

export default function Login() {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login }    = useAuth()
  const { showToast } = useToast()
  const navigate      = useNavigate()
  const { logo, nome } = useEmpresaConfig()

  async function handleLogin() {
    if (loading) return
    setLoading(true)
    const result = await login(email, pass)
    setLoading(false)
    if (result.ok) {
      showToast('Bem-vindo, ' + result.name.split(' ')[0] + '!', 'success')
      navigate('/dashboard')
    } else {
      showToast(result.message ?? 'E-mail ou senha incorretos', 'danger')
    }
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon" style={{ overflow: 'hidden' }}>
            {logo
              ? <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <IconLogo />
            }
          </div>
          <div>
            <div className="login-logo-name">{nome.toUpperCase().slice(0, 20)}</div>
            <div className="login-logo-tag">Sistema de Gestão</div>
          </div>
        </div>
        <div className="login-title">Entrar na sua conta</div>
        <div className="login-sub">Acesse seu painel de gestão</div>

        <div className="form-group">
          <label className="form-label">Usuário</label>
          <input
            className="form-input"
            type="text"
            placeholder="seu usuário"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Senha</label>
          <input
            className="form-input"
            type="password"
            placeholder="••••••"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
