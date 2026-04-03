import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../context/ToastContext'
import { cobrancasApi } from '../services/api'
import { useData } from '../context/DataContext'
import { planos } from '../db/adminClientes'
import { abrirWhatsApp } from '../components/WaButton'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function mesLabel(mesRef) {
  const [a, m] = mesRef.split('-')
  return `${MESES[parseInt(m) - 1]}/${a}`
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminFinanceiro() {
  const { showToast } = useToast()
  const { adminClientes, removeAdminCliente } = useData()
  const [cobrancas, setCobrancas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mesFiltro, setMesFiltro] = useState(mesAtual())

  async function carregar() {
    setLoading(true)
    try { setCobrancas(await cobrancasApi.list()) }
    catch (e) { showToast(e.message, 'danger') }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const cobrancasMes = useMemo(() =>
    cobrancas.filter(c => c.mes_ref === mesFiltro)
  , [cobrancas, mesFiltro])
  const pgCobrancas = usePagination(cobrancasMes)
  const pgClientesPlano = usePagination(adminClientes)

  const totalMes     = cobrancasMes.reduce((s, c) => s + Number(c.valor), 0)
  const totalPago    = cobrancasMes.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = totalMes - totalPago
  const clientesAtivos = adminClientes.filter(c => c.status === 'ativo').length

  // Meses disponíveis para o filtro
  const mesesDisp = useMemo(() => {
    const set = new Set(cobrancas.map(c => c.mes_ref))
    set.add(mesAtual())
    return [...set].sort().reverse()
  }, [cobrancas])

  const nomeEmpresa = (() => {
    try { return JSON.parse(localStorage.getItem('vc_empresa'))?.nome ?? 'ControlCA$H' } catch { return 'ControlCA$H' }
  })()

  function montarMsgCobranca(cliente, valor, mes) {
    return [
      `Olá ${(cliente.contato || cliente.empresa).split(' ')[0]}! 👋`,
      ``,
      `Segue a cobrança referente à mensalidade do sistema:`,
      ``,
      `📋 *Empresa:* ${cliente.empresa}`,
      `📅 *Referência:* ${mes}`,
      `💰 *Valor:* R$ ${Number(valor).toFixed(2).replace('.', ',')}`,
      `📌 *Plano:* ${planos[cliente.plano]?.label || cliente.plano}`,
      ``,
      `Favor efetuar o pagamento e nos enviar o comprovante.`,
      ``,
      `Obrigado! 😊`,
      `— ${nomeEmpresa}`,
    ].join('\n')
  }

  async function gerarMes() {
    try {
      const res = await cobrancasApi.gerarMes(mesFiltro)
      showToast(`${res.gerados} cobrança(s) gerada(s) para ${mesLabel(mesFiltro)}`, 'success')
      carregar()
    } catch (e) { showToast(e.message, 'danger') }
  }

  // Envio individual
  function enviarCobrancaIndividual(c) {
    const cli = adminClientes.find(a => a.id === c.admin_cliente_id)
    if (!cli?.telefone) return showToast('Telefone não cadastrado para este cliente', 'danger')
    const msg = montarMsgCobranca(cli, c.valor, mesLabel(c.mes_ref))
    abrirWhatsApp(cli.telefone.replace(/\D/g, ''), msg)
  }

  // Editar cobrança
  const [editando, setEditando] = useState(null)
  const [editValor, setEditValor] = useState('')

  function abrirEdicao(c) {
    setEditando(c)
    setEditValor(Number(c.valor).toFixed(2))
  }

  async function salvarEdicao() {
    if (!editando) return
    try {
      const atualizado = await cobrancasApi.update(editando.id, { valor: parseFloat(editValor) || 0 })
      setCobrancas(prev => prev.map(c => c.id === editando.id ? { ...c, ...atualizado } : c))
      showToast('Cobrança atualizada!', 'success')
      setEditando(null)
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function excluirCobranca(c) {
    if (!confirm(`Excluir cobrança de "${c.empresa}" — ${mesLabel(c.mes_ref)}?`)) return
    try {
      await cobrancasApi.remove(c.id)
      setCobrancas(prev => prev.filter(x => x.id !== c.id))
      showToast('Cobrança excluída', 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function marcarPago(id) {
    try {
      const atualizado = await cobrancasApi.pagar(id)
      setCobrancas(prev => prev.map(c => c.id === id ? { ...c, ...atualizado } : c))
      showToast('Pagamento confirmado!', 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function estornar(id) {
    try {
      const atualizado = await cobrancasApi.estornar(id)
      setCobrancas(prev => prev.map(c => c.id === id ? { ...c, ...atualizado } : c))
      showToast('Pagamento estornado', 'info')
    } catch (e) { showToast(e.message, 'danger') }
  }

  return (
    <div id="page-admin-financeiro">
      <div className="topbar">
        <div>
          <div className="topbar-title">Financeiro do Sistema</div>
          <div className="topbar-sub">Controle de recorrência dos clientes</div>
        </div>
        <div className="topbar-actions">
          <select className="form-input" style={{ width: 140, padding: '6px 10px', fontSize: 12 }}
            value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}>
            {mesesDisp.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={gerarMes}>
            Gerar cobranças — {mesLabel(mesFiltro)}
          </button>
        </div>
      </div>

      <div className="content">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Clientes Ativos</div>
            <div className="metric-value">{clientesAtivos}</div>
            <div className="metric-delta">com cobrança recorrente</div>
          </div>
          <div className="metric-card green">
            <div className="metric-label">Recebido no Mês</div>
            <div className="metric-value green">R$ {totalPago.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{cobrancasMes.filter(c => c.status === 'pago').length} pago(s)</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">Pendente</div>
            <div className="metric-value amber">R$ {totalPendente.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{cobrancasMes.filter(c => c.status !== 'pago').length} pendente(s)</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">MRR Esperado</div>
            <div className="metric-value">R$ {totalMes.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{mesLabel(mesFiltro)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Cobranças — {mesLabel(mesFiltro)}</div>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)' }}>Carregando...</div>
          ) : cobrancasMes.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)', fontSize: 13 }}>
              Nenhuma cobrança gerada para este mês. Clique em "Gerar cobranças" para criar.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th><th>Contato</th><th>Plano</th><th>Valor Plano</th>
                    <th>Valor Cobrado</th><th>Status</th><th>Pagamento</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pgCobrancas.paginated.map(c => (
                    <tr key={c.id}>
                      <td className="td-bold">{c.empresa}</td>
                      <td>{c.contato}</td>
                      <td><span className={`plan-badge plan-${c.plano}`}>{planos[c.plano]?.label || c.plano}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-s)' }}>R$ {(planos[c.plano]?.preco ?? Number(c.valor_plano)).toFixed(2).replace('.', ',')}/mês</td>
                      <td style={{ fontWeight: 600 }}>R$ {Number(c.valor).toFixed(2).replace('.', ',')}</td>
                      <td>
                        <span className={`status ${c.status === 'pago' ? 'status-concluido' : c.status === 'atrasado' ? 'status-vencido' : 'status-pendente'}`}>
                          {c.status === 'pago' ? 'Pago' : c.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-s)' }}>
                        {c.data_pagamento ? new Date(c.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td>
                        <div className="flex gap-8">
                          {c.status !== 'pago' && (
                            <button className="btn-icon" title="Enviar cobrança via WhatsApp" onClick={() => enviarCobrancaIndividual(c)}>
                              <svg viewBox="0 0 24 24" fill="#25d366" style={{width:14,height:14}}>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </button>
                          )}
                          <button className="btn-icon" title="Editar valor" onClick={() => abrirEdicao(c)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon btn-danger" title="Excluir" onClick={() => excluirCobranca(c)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            </svg>
                          </button>
                          {c.status !== 'pago' ? (
                            <button className="btn btn-sm btn-success" onClick={() => marcarPago(c.id)}>
                              Confirmar pgto
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline" onClick={() => estornar(c.id)}>
                              Estornar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={pgCobrancas.page} totalPages={pgCobrancas.totalPages} total={pgCobrancas.total} perPage={pgCobrancas.perPage} onPageChange={pgCobrancas.goTo} onPerPageChange={pgCobrancas.changePerPage} />
        </div>

        {/* Resumo de clientes por plano */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><div className="card-title">Clientes por Plano</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Empresa</th><th>Contato</th><th>Plano</th><th>Recorrência</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {pgClientesPlano.paginated.map(c => (
                  <tr key={c.id}>
                    <td className="td-bold">{c.empresa}</td>
                    <td>{c.contato}</td>
                    <td><span className={`plan-badge plan-${c.plano}`}>{planos[c.plano]?.label || c.plano}</span></td>
                    <td style={{ fontWeight: 600 }}>R$ {Number(c.recorrencia).toFixed(2).replace('.', ',')}/mês</td>
                    <td>
                      <span className={`status ${c.status === 'ativo' ? 'status-concluido' : 'status-vencido'}`}>
                        {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon btn-danger" title="Excluir cliente" onClick={() => { if (confirm(`Excluir "${c.empresa}" do sistema?`)) removeAdminCliente(c.id).catch(e => showToast(e.message, 'danger')) }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                          <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgClientesPlano.page} totalPages={pgClientesPlano.totalPages} total={pgClientesPlano.total} perPage={pgClientesPlano.perPage} onPageChange={pgClientesPlano.goTo} onPerPageChange={pgClientesPlano.changePerPage} />
        </div>
      </div>

      {/* Modal editar cobrança */}
      {editando && (
        <Modal title={`Editar cobrança — ${editando.empresa}`} open={!!editando} onClose={() => setEditando(null)}>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg4)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            <strong>{editando.empresa}</strong> — {planos[editando.plano]?.label || editando.plano} — {mesLabel(editando.mes_ref)}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor cobrado (R$)</label>
            <input className="form-input" type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={salvarEdicao}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
