import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { exportCSV } from '../utils/exportCSV'
import { maskValor, parseMaskedValor, numToMasked } from '../utils/masks'
import QuickAddModal from '../components/QuickAddModal'

export default function Pagar() {
  const { contasPagar, addContaPagar, updateContaPagar, removeContaPagar, marcarPago, fornecedores } = useData()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ fornecedor: '', descricao: '', valor: '', vencimento: '' })
  const [quickAdd, setQuickAdd] = useState(false)

  const pgPagar = usePagination(contasPagar)
  const pendentes = contasPagar.filter(c => c.status === 'pendente')
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0)
  const pago = contasPagar.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)

  // Vence em 7 dias
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const em7dias = new Date(hoje); em7dias.setDate(hoje.getDate() + 7)
  const vence7 = pendentes.filter(c => {
    const parts = (c.vencimento || '').split('/')
    const d = parts.length === 3 ? new Date(parts[2], parts[1]-1, parts[0]) : new Date(c.vencimento)
    return d >= hoje && d <= em7dias
  })
  const totalVence7 = vence7.reduce((s, c) => s + Number(c.valor), 0)

  function abrirEdicao(c) {
    setEditando(c)
    setForm({ fornecedor: c.fornecedor, descricao: c.descricao || '', valor: numToMasked(c.valor), vencimento: '' })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.fornecedor || !form.valor) return showToast('Preencha os campos obrigatórios', 'danger')
    if (!editando && !form.vencimento) return showToast('Informe a data de vencimento', 'danger')
    try {
      if (editando) {
        await updateContaPagar(editando.id, { ...form, valor: parseMaskedValor(form.valor) })
        showToast('Conta atualizada!', 'success')
      } else {
        await addContaPagar({ ...form, valor: parseMaskedValor(form.valor), status: 'pendente' })
        showToast('Conta lançada com sucesso!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm({ fornecedor: '', descricao: '', valor: '', vencimento: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  function handleMarcarPago(id, fornecedor) {
    marcarPago(id)
    showToast(`Conta de ${fornecedor} marcada como paga!`, 'success')
  }

  return (
    <div id="page-pagar">
      <div className="topbar">
        <div>
          <div className="topbar-title">Contas a Pagar</div>
          <div className="topbar-sub">Fornecedores e despesas</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(contasPagar, 'contas_pagar')}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Lançar Conta</button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card red">
            <div className="metric-label">Total a Pagar</div>
            <div className="metric-value red">R$ {totalPendente.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{pendentes.length} contas em aberto</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">Vence em 7 dias</div>
            <div className="metric-value amber">R$ {totalVence7.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{vence7.length} conta(s)</div>
          </div>
          <div className="metric-card green">
            <div className="metric-label">Pago no Mês</div>
            <div className="metric-value green">R$ {pago.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{contasPagar.filter(c => c.status === 'pago').length} contas pagas</div>
          </div>
        </div>

        {vence7.length > 0 && (
          <div className="alert-box warning mb-16">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="alert-title">{vence7.length} conta(s) vence(m) nos próximos 7 dias</div>
              <div className="alert-text">{vence7.map(c => `${c.fornecedor} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} vence em ${c.vencimento}`).join(' · ')}</div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><div className="card-title">Lançamentos</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fornecedor</th><th>Descrição</th><th>Valor</th>
                  <th>Vencimento</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pgPagar.paginated.map(c => (
                  <tr key={c.id}>
                    <td className="td-bold">{c.fornecedor}</td>
                    <td>{c.descricao}</td>
                    <td className="td-bold">R$ {Number(c.valor).toFixed(2).replace('.', ',')}</td>
                    <td>{c.vencimento}</td>
                    <td><span className={`status status-${c.status}`}>{c.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
                    <td>
                      <div className="flex gap-8" style={{ alignItems: 'center' }}>
                        <button className="btn-icon btn-danger" onClick={() => { if (confirm(`Excluir conta de ${c.fornecedor}?`)) removeContaPagar(c.id).catch(e => showToast(e.message, 'danger')) }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        </button>
                        {c.status === 'pendente' && (
                          <>
                            <button className="btn-icon" onClick={() => abrirEdicao(c)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="btn btn-sm btn-success" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleMarcarPago(c.id, c.fornecedor)}>
                              ✓ Pago
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgPagar.page} totalPages={pgPagar.totalPages} total={pgPagar.total} perPage={pgPagar.perPage} onPageChange={pgPagar.goTo} onPerPageChange={pgPagar.changePerPage} />
        </div>
      </div>

      <Modal title={editando ? 'Editar Conta a Pagar' : 'Lançar Conta a Pagar'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setForm({ fornecedor: '', descricao: '', valor: '', vencimento: '' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fornecedor</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-input" list="lista-fornecedores" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome do fornecedor" />
              <datalist id="lista-fornecedores">
                {(fornecedores ?? []).map(f => <option key={f.id} value={f.nome} />)}
              </datalist>
              <button type="button" className="btn btn-outline btn-sm" style={{ flexShrink: 0, padding: '0 10px', fontSize: 18, lineHeight: 1 }} title="Novo fornecedor" onClick={() => setQuickAdd(true)}>+</button>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" inputMode="decimal" placeholder="0,00" value={form.valor} onChange={e => setForm({ ...form, valor: maskValor(e.target.value) })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descrição</label>
            <input className="form-input" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Materiais câmeras" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vencimento</label>
            <input className="form-input" type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Salvar</button>
        </div>
      </Modal>

      <QuickAddModal
        type="fornecedor"
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        onSaved={novo => setForm(f => ({ ...f, fornecedor: novo.nome }))}
      />
    </div>
  )
}
