import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { planos } from '../db/adminClientes'
import { abrirWhatsApp } from '../components/WaButton'
import { adminApi } from '../services/api'
import { maskTelefone, maskCPF_CNPJ } from '../utils/masks'

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
  </svg>
)
const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:13,height:13}}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const MODULOS = [
  { label: 'Dashboard',        icon: '▣', essencial: true,  profissional: true,  empresa: true  },
  { label: 'Vendas',           icon: '$', essencial: true,  profissional: true,  empresa: true  },
  { label: 'Contas a Receber', icon: '↗', essencial: true,  profissional: true,  empresa: true  },
  { label: 'Cadastros',        icon: '👥', essencial: true,  profissional: true,  empresa: true  },
  { label: 'Contratos',        icon: '📄', essencial: false, profissional: true,  empresa: true  },
  { label: 'Estoque',          icon: '📦', essencial: false, profissional: true,  empresa: true  },
  { label: 'Contas a Pagar',   icon: '💳', essencial: false, profissional: false, empresa: true  },
  { label: 'Inadimplência',    icon: '⚠', essencial: false, profissional: false, empresa: true  },
]

function PermissoesPlano({ plano }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-xs)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        Módulos incluídos no plano
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {MODULOS.map(m => {
          const ativo = m[plano] === true
          return (
            <div key={m.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 'var(--radius)',
              background: ativo ? 'var(--purple-xl, #f5f3ff)' : 'var(--bg3)',
              border: `1px solid ${ativo ? 'var(--purple-l, #ddd6fe)' : 'var(--border)'}`,
              opacity: ativo ? 1 : 0.5,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ativo ? 'var(--purple)' : 'var(--bg4)',
                fontSize: 10,
              }}>
                {ativo
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{width:10,height:10}}><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-xs)" strokeWidth="3" strokeLinecap="round" style={{width:10,height:10}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </span>
              <span style={{ fontSize: 12, fontWeight: ativo ? 600 : 400, color: ativo ? 'var(--purple-d)' : 'var(--text-xs)' }}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const FORM_VAZIO = { empresa: '', contato: '', cpf_cnpj: '', telefone: '', email_contato: '', plano: 'essencial' }

export default function Admin() {
  const { adminClientes, addAdminCliente, updateAdminCliente, removeAdminCliente } = useData()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState(null)
  const [form, setForm]           = useState(FORM_VAZIO)

  const pgAdmin = usePagination(adminClientes)
  const mrr  = adminClientes.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.recorrencia), 0)
  const setup = adminClientes.reduce((s, c) => s + Number(c.setup), 0)

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setModalOpen(true)
  }

  function abrirEdicao(c) {
    setEditando(c)
    setForm({
      empresa: c.empresa, contato: c.contato, cpf_cnpj: c.cpf_cnpj || '',
      telefone: c.telefone || '', email_contato: c.email_contato || '', plano: c.plano,
    })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.empresa || !form.contato) return showToast('Empresa e contato são obrigatórios', 'danger')
    if (!editando && !form.email_contato) return showToast('E-mail do contato é obrigatório', 'danger')

    const plano = planos[form.plano]
    try {
      if (editando) {
        await updateAdminCliente(editando.id, {
          empresa: form.empresa, contato: form.contato, cpf_cnpj: form.cpf_cnpj,
          telefone: form.telefone, email_contato: form.email_contato,
          plano: form.plano, setup: plano.preco * 3, recorrencia: plano.preco,
        })
        showToast('Cliente atualizado!', 'success')
      } else {
        const novo = await addAdminCliente({
          empresa: form.empresa, contato: form.contato, cpf_cnpj: form.cpf_cnpj,
          telefone: form.telefone, email_contato: form.email_contato,
          plano: form.plano, setup: plano.preco * 3, recorrencia: plano.preco,
        })

        // Envia senha temporária via WhatsApp se tiver telefone
        if (novo.temp_senha && form.telefone) {
          const link = window.location.origin
          const msg = [
            `Olá ${form.contato.split(' ')[0]}! 👋`,
            ``,
            `Seu acesso ao *ControlCA$H* foi criado com sucesso!`,
            ``,
            `🔗 *Acesse aqui:* ${link}`,
            `🔐 *E-mail:* ${form.email_contato}`,
            `🔑 *Senha temporária:* ${novo.temp_senha}`,
            ``,
            `Acesse o sistema e altere sua senha em *Configurações*.`,
          ].join('\n')
          abrirWhatsApp(form.telefone.replace(/\D/g, ''), msg)
        } else if (novo.temp_senha) {
          showToast(`Senha temporária: ${novo.temp_senha} — copie antes de fechar!`, 'success')
        }

        showToast('Cliente cadastrado! Acesso criado.', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm(FORM_VAZIO)
    } catch (e) { showToast(e.message, 'danger') }
  }

  function reenviarAcesso(c) {
    if (!c.telefone) return showToast('Telefone não cadastrado para este cliente', 'danger')
    const link = window.location.origin
    const msg = [
      `Olá ${c.contato.split(' ')[0]}! 👋`,
      ``,
      `Seu acesso ao *ControlCA$H* está disponível.`,
      ``,
      `🔗 *Acesse aqui:* ${link}`,
      `🔐 *E-mail:* ${c.email_contato}`,
      ``,
      `Caso tenha esquecido sua senha, entre em contato conosco.`,
    ].join('\n')
    abrirWhatsApp(c.telefone.replace(/\D/g, ''), msg)
  }

  async function toggleStatus(c) {
    const novoStatus = c.status === 'ativo' ? 'inativo' : 'ativo'
    const label = novoStatus === 'ativo' ? 'Ativar' : 'Inativar'
    if (!confirm(`${label} "${c.empresa}" e ${novoStatus === 'ativo' ? 'liberar' : 'bloquear'} o acesso ao sistema?`)) return
    try {
      const atualizado = await adminApi.toggleStatus(c.id, { status: novoStatus })
      // Atualiza na lista local
      const idx = adminClientes.findIndex(x => x.id === c.id)
      if (idx >= 0) adminClientes[idx] = { ...adminClientes[idx], ...atualizado }
      showToast(`${c.empresa} ${novoStatus === 'ativo' ? 'ativado' : 'inativado'}!`, 'success')
      window.location.reload()
    } catch (e) { showToast(e.message, 'danger') }
  }

  return (
    <div id="page-admin">
      <div className="topbar">
        <div>
          <div className="topbar-title">Clientes do Sistema</div>
          <div className="topbar-sub">Painel administrativo · ControlCA$H by Virtual Core</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm" onClick={abrirNovo}>+ Novo Cliente</button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Total de Clientes</div>
            <div className="metric-value">{adminClientes.length}</div>
            <div className="metric-delta">cadastrados</div>
          </div>
          <div className="metric-card green">
            <div className="metric-label">MRR</div>
            <div className="metric-value green">R$ {mrr.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">Recorrência mensal</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Setup Total</div>
            <div className="metric-value">R$ {setup.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">Entrada acumulada</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">Churn</div>
            <div className="metric-value amber">0</div>
            <div className="metric-delta">Cancelamentos</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Clientes Cadastrados</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th><th>Contato</th><th>CPF/CNPJ</th><th>Plano</th>
                  <th>Setup</th><th>Recorrência</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pgAdmin.paginated.map(c => (
                  <tr key={c.id}>
                    <td className="td-bold">{c.empresa}</td>
                    <td>
                      <div>{c.contato}</div>
                      {c.email_contato && <div style={{ fontSize: 11, color: 'var(--text-s)' }}>{c.email_contato}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-s)' }}>{c.cpf_cnpj || '—'}</td>
                    <td><span className={`plan-badge plan-${c.plano}`}>{planos[c.plano]?.label || c.plano}</span></td>
                    <td>R$ {Number(c.setup).toFixed(2).replace('.', ',')}</td>
                    <td>R$ {Number(c.recorrencia).toFixed(2).replace('.', ',')}/mês</td>
                    <td>
                      <span className={`status ${c.status === 'ativo' ? 'status-concluido' : 'status-vencido'}`}
                        style={{ cursor: 'pointer' }} onClick={() => toggleStatus(c)}
                        title={`Clique para ${c.status === 'ativo' ? 'inativar' : 'ativar'}`}>
                        {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn-icon" title="Reenviar acesso via WhatsApp" onClick={() => reenviarAcesso(c)}>
                          <WaIcon />
                        </button>
                        <button className="btn-icon" title="Editar" onClick={() => abrirEdicao(c)}>
                          <EditIcon />
                        </button>
                        <button className="btn-icon btn-danger" title="Excluir"
                          onClick={() => { if (confirm(`Excluir "${c.empresa}" e seu acesso ao sistema?`)) removeAdminCliente(c.id).catch(e => showToast(e.message, 'danger')) }}>
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgAdmin.page} totalPages={pgAdmin.totalPages} total={pgAdmin.total} perPage={pgAdmin.perPage} onPageChange={pgAdmin.goTo} onPerPageChange={pgAdmin.changePerPage} />
        </div>
      </div>

      <Modal
        title={editando ? `Editar — ${editando.empresa}` : 'Novo Cliente do Sistema'}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null); setForm(FORM_VAZIO) }}
      >
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Empresa</label>
            <input className="form-input" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome do contato</label>
            <input className="form-input" value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">CPF / CNPJ</label>
            <input className="form-input" value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: maskCPF_CNPJ(e.target.value) })} placeholder="000.000.000-00" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Telefone (WhatsApp)</label>
            <input className="form-input" value={form.telefone} onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">E-mail de acesso {!editando && <span style={{ color: 'var(--red)', fontSize: 10 }}>*obrigatório</span>}</label>
            <input className="form-input" type="email" value={form.email_contato}
              onChange={e => setForm({ ...form, email_contato: e.target.value })}
              placeholder="contato@empresa.com"
              disabled={!!editando}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Plano</label>
            <select className="form-input" value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value })}>
              {Object.entries(planos).map(([key, { label, preco }]) => (
                <option key={key} value={key}>{label} — R$ {preco}/mês</option>
              ))}
            </select>
          </div>
        </div>
        {/* Visualização de permissões por plano */}
        <PermissoesPlano plano={form.plano} />

        {!editando && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg4)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-s)' }}>
            Uma senha temporária será gerada e enviada via WhatsApp ao contato cadastrado.
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => { setModalOpen(false); setEditando(null); setForm(FORM_VAZIO) }}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>{editando ? 'Salvar' : 'Cadastrar e enviar acesso'}</button>
        </div>
      </Modal>
    </div>
  )
}
