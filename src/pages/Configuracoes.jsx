import { useState, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

const EMPRESA_KEY = 'vc_empresa'
const LOGO_KEY    = 'vc_logo'

function loadEmpresa() {
  try { return JSON.parse(localStorage.getItem(EMPRESA_KEY)) ?? { nome: 'ControlCA$H by Virtual Core', cnpj: '00.000.000/0001-00' } }
  catch { return { nome: 'ControlCA$H by Virtual Core', cnpj: '00.000.000/0001-00' } }
}

const temas = [
  {
    key: 'light',
    label: 'Claro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:22,height:22}}>
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    key: 'dark',
    label: 'Escuro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:22,height:22}}>
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
    ),
  },
  {
    key: 'auto',
    label: 'Automático',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:22,height:22}}>
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
]

export default function Configuracoes() {
  const { theme, changeTheme } = useTheme()
  const { showToast } = useToast()
  const logoRef = useRef()

  const [empresa, setEmpresa] = useState(loadEmpresa)
  const [logo, setLogo]       = useState(() => localStorage.getItem(LOGO_KEY) ?? null)

  function salvarEmpresa() {
    localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa))
    showToast('Dados da empresa salvos!', 'success')
    // Dispara evento para que Sidebar e outros componentes atualizem
    window.dispatchEvent(new Event('vc-empresa-updated'))
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 512 * 1024) return showToast('Logo muito grande. Use até 512 KB.', 'danger')
    const reader = new FileReader()
    reader.onload = ev => {
      const base64 = ev.target.result
      setLogo(base64)
      localStorage.setItem(LOGO_KEY, base64)
      window.dispatchEvent(new Event('vc-empresa-updated'))
      showToast('Logo atualizada!', 'success')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function removerLogo() {
    setLogo(null)
    localStorage.removeItem(LOGO_KEY)
    window.dispatchEvent(new Event('vc-empresa-updated'))
    showToast('Logo removida', 'info')
  }

  return (
    <div id="page-configuracoes">
      <div className="topbar">
        <div>
          <div className="topbar-title">Configurações</div>
          <div className="topbar-sub">Personalização do sistema</div>
        </div>
      </div>

      <div className="content" style={{ maxWidth: 680 }}>

        {/* ── Empresa ── */}
        <div className="card mb-16">
          <div className="card-header"><div className="card-title">Dados da Empresa</div></div>
          <div style={{ padding: '16px 20px' }}>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Empresa</label>
                <input
                  className="form-input"
                  value={empresa.nome}
                  onChange={e => setEmpresa({ ...empresa, nome: e.target.value })}
                  placeholder="Ex: ControlCA$H by Virtual Core"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CNPJ</label>
                <input
                  className="form-input"
                  value={empresa.cnpj}
                  onChange={e => setEmpresa({ ...empresa, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={salvarEmpresa}>Salvar dados</button>
            </div>
          </div>
        </div>

        {/* ── Logo ── */}
        <div className="card mb-16">
          <div className="card-header"><div className="card-title">Logo da Empresa</div></div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Preview */}
              <div style={{
                width: 80, height: 80, borderRadius: 12,
                background: 'var(--bg3)', border: '2px dashed var(--border-p)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {logo
                  ? <img src={logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" style={{width:32,height:32}}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                }
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-s)', marginBottom: 12 }}>
                  PNG, JPG ou SVG · máx. 512 KB<br/>
                  Aparece na sidebar e nos contratos PDF.
                </div>
                <div className="flex gap-8">
                  <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  <button className="btn btn-outline btn-sm" onClick={() => logoRef.current.click()}>
                    📁 Escolher arquivo
                  </button>
                  {logo && (
                    <button className="btn btn-sm btn-danger" onClick={removerLogo}>Remover</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tema ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Aparência</div></div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, color: 'var(--text-s)', marginBottom: 16 }}>
              Escolha como o sistema deve aparecer. O modo <strong>Automático</strong> segue a preferência do seu sistema operacional.
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {temas.map(t => (
                <button
                  key={t.key}
                  onClick={() => changeTheme(t.key)}
                  style={{
                    flex: 1, padding: '16px 8px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${theme === t.key ? 'var(--purple)' : 'var(--border)'}`,
                    background: theme === t.key ? 'var(--purple-xl)' : 'var(--bg4)',
                    color: theme === t.key ? 'var(--purple)' : 'var(--text-s)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    fontFamily: 'inherit', fontWeight: theme === t.key ? 700 : 500,
                    fontSize: 13, transition: 'all .15s',
                  }}
                >
                  {t.icon}
                  {t.label}
                  {theme === t.key && (
                    <span style={{ fontSize: 10, background: 'var(--purple)', color: '#fff', borderRadius: 6, padding: '1px 7px' }}>
                      Ativo
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
