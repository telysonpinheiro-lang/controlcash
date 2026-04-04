import { useState, useEffect } from 'react'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { exportCSV } from '../utils/exportCSV'
import { estoqueApi } from '../services/api'

export default function Estoque() {
  const { showToast } = useToast()
  const [itens, setItens]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalMov, setModalMov]   = useState(null)
  const [modalHist, setModalHist] = useState(null)   // item cujo histórico está aberto
  const [historico, setHistorico] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [aba, setAba]             = useState('todos')
  const [form, setForm] = useState({ nome: '', categoria: '', unidade: 'un', qtd_atual: '', qtd_minima: '', custo_unit: '' })
  const [movForm, setMovForm] = useState({ tipo: 'entrada', quantidade: '', observacao: '' })
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({})

  async function carregar() {
    setLoading(true)
    try {
      setItens(await estoqueApi.list())
    } catch (e) { showToast('Erro ao carregar estoque', 'danger') }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const itensFiltrados = aba === 'baixo'
    ? itens.filter(i => Number(i.estoque_baixo))
    : itens
  const pgEstoque = usePagination(itensFiltrados)

  async function abrirHistorico(item) {
    setModalHist(item)
    setHistorico([])
    setHistLoading(true)
    try {
      setHistorico(await estoqueApi.historico(item.id))
    } catch (e) { showToast('Erro ao carregar histórico', 'danger') }
    finally { setHistLoading(false) }
  }

  async function excluirMovimento(movId) {
    if (!confirm('Excluir este movimento? O saldo será revertido.')) return
    try {
      await estoqueApi.removeMovimento(movId)
      setHistorico(prev => prev.filter(m => m.id !== movId))
      showToast('Movimento excluído e saldo revertido', 'success')
      carregar()
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function salvarItem() {
    if (!form.nome) return showToast('Nome é obrigatório', 'danger')
    try {
      await estoqueApi.criar(form)
      showToast('Item cadastrado!', 'success')
      setModalNovo(false)
      setForm({ nome: '', categoria: '', unidade: 'un', qtd_atual: '', qtd_minima: '', custo_unit: '' })
      carregar()
    } catch (e) { showToast(e.message, 'danger') }
  }

  function abrirEdicao(item) {
    setEditando(item)
    setEditForm({
      nome: item.nome,
      categoria: item.categoria || '',
      unidade: item.unidade || 'un',
      qtd_minima: item.qtd_minima,
      custo_unit: item.custo_unit,
    })
  }

  async function salvarEdicao() {
    if (!editForm.nome) return showToast('Nome é obrigatório', 'danger')
    try {
      const data = await estoqueApi.update(editando.id, editForm)
      setItens(prev => prev.map(i => i.id === editando.id ? { ...i, ...data } : i))
      showToast('Item atualizado!', 'success')
      setEditando(null)
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function excluirItem(item) {
    if (!confirm(`Excluir "${item.nome}" do estoque?`)) return
    try {
      await estoqueApi.remove(item.id)
      setItens(prev => prev.filter(i => i.id !== item.id))
      showToast('Item excluído!', 'success')
    } catch (e) { showToast(e.message, 'danger') }
  }

  async function registrarMovimento() {
    if (!movForm.quantidade) return showToast('Quantidade obrigatória', 'danger')
    try {
      const fn = movForm.tipo === 'entrada' ? estoqueApi.entrada : estoqueApi.saida
      const json = await fn(modalMov.id, movForm)
      if (json.error) return showToast(json.error, 'danger')
      showToast(`${movForm.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada!`, 'success')
      setModalMov(null)
      setMovForm({ tipo: 'entrada', quantidade: '', observacao: '' })
      carregar()
    } catch (e) { showToast(e.message, 'danger') }
  }

  const baixoEstoque = itens.filter(i => Number(i.estoque_baixo)).length

  return (
    <div id="page-estoque">
      <div className="topbar">
        <div>
          <div className="topbar-title">Estoque de Materiais</div>
          <div className="topbar-sub">Controle de entrada e saída por serviço</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(itens, 'estoque')}>⬇ CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalNovo(true)}>+ Novo Item</button>
        </div>
      </div>

      <div className="content">
        {baixoEstoque > 0 && (
          <div className="alert-box warning mb-16">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="alert-title">{baixoEstoque} item(s) com estoque abaixo do mínimo</div>
              <div className="alert-text">Verifique os itens em alerta e solicite reposição ao fornecedor.</div>
            </div>
          </div>
        )}

        {/* Métricas */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card">
            <div className="metric-label">Total de Itens</div>
            <div className="metric-value">{itens.length}</div>
            <div className="metric-delta">no catálogo</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">Estoque Baixo</div>
            <div className="metric-value amber">{baixoEstoque}</div>
            <div className="metric-delta">abaixo do mínimo</div>
          </div>
          <div className="metric-card green">
            <div className="metric-label">Valor em Estoque</div>
            <div className="metric-value green">
              R$ {itens.reduce((s, i) => s + (Number(i.qtd_atual) * Number(i.custo_unit)), 0).toFixed(2).replace('.', ',')}
            </div>
            <div className="metric-delta">custo total estimado</div>
          </div>
        </div>

        <div className="filter-bar mb-16">
          <button className={`filter-btn${aba === 'todos' ? ' active' : ''}`} onClick={() => setAba('todos')}>Todos</button>
          <button className={`filter-btn${aba === 'baixo' ? ' active' : ''}`} onClick={() => setAba('baixo')}>
            Estoque Baixo {baixoEstoque > 0 && <span className="nav-badge" style={{ marginLeft: 4 }}>{baixoEstoque}</span>}
          </button>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Itens em Estoque</div></div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)' }}>Carregando...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd Mínima</th>
                    <th>Custo Unit.</th><th>Fornecedor</th><th>Status</th><th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pgEstoque.paginated.map(item => (
                    <tr key={item.id}>
                      <td className="td-bold">{item.nome}</td>
                      <td><span className="tag">{item.categoria || '—'}</span></td>
                      <td style={{ fontWeight: 700, color: Number(item.estoque_baixo) ? 'var(--red)' : 'var(--text)' }}>
                        {Number(item.qtd_atual)} {item.unidade}
                      </td>
                      <td style={{ color: 'var(--text-s)' }}>{Number(item.qtd_minima)} {item.unidade}</td>
                      <td>R$ {Number(item.custo_unit).toFixed(2).replace('.', ',')}</td>
                      <td>{item.fornecedor_nome || '—'}</td>
                      <td>
                        {Number(item.estoque_baixo)
                          ? <span className="status status-vencido">Estoque baixo</span>
                          : <span className="status status-concluido">Normal</span>}
                      </td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn btn-sm btn-success" title="Entrada"
                            onClick={() => { setModalMov(item); setMovForm({ tipo: 'entrada', quantidade: '', observacao: '' }) }}>
                            + Entrada
                          </button>
                          <button className="btn btn-sm btn-danger" title="Saída"
                            onClick={() => { setModalMov(item); setMovForm({ tipo: 'saida', quantidade: '', observacao: '' }) }}>
                            − Saída
                          </button>
                          <button className="btn btn-sm btn-outline" title="Histórico" onClick={() => abrirHistorico(item)}>
                            Histórico
                          </button>
                          <button className="btn-icon" title="Editar" onClick={() => abrirEdicao(item)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon btn-danger" title="Excluir" onClick={() => excluirItem(item)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}>
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={pgEstoque.page} totalPages={pgEstoque.totalPages} total={pgEstoque.total} perPage={pgEstoque.perPage} onPageChange={pgEstoque.goTo} onPerPageChange={pgEstoque.changePerPage} />
        </div>
      </div>

      {/* Modal histórico */}
      {modalHist && (
        <Modal title={`Histórico — ${modalHist.nome}`} open={!!modalHist} onClose={() => setModalHist(null)}>
          {histLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)' }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)', fontSize: 13 }}>Nenhuma movimentação registrada.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th><th>Qtd</th><th>Observação</th><th>Data</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span className={`status ${m.tipo === 'entrada' ? 'status-concluido' : 'status-vencido'}`}>
                          {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{Number(m.quantidade)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-s)' }}>{m.observacao || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-s)' }}>
                        {new Date(m.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <button className="btn-icon btn-danger" title="Excluir movimento" onClick={() => excluirMovimento(m.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{width:13,height:13}}>
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-outline btn-sm" onClick={() => setModalHist(null)}>Fechar</button>
          </div>
        </Modal>
      )}

      {/* Modal novo item */}
      <Modal title="Novo Item em Estoque" open={modalNovo} onClose={() => setModalNovo(false)}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome do item</label>
            <input className="form-input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoria</label>
            <input className="form-input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: CFTV, Rede, Hardware" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Unidade</label>
            <select className="form-input" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })}>
              <option>un</option><option>rolo</option><option>kg</option><option>m</option><option>cx</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Custo unitário (R$)</label>
            <input className="form-input" type="number" value={form.custo_unit} onChange={e => setForm({ ...form, custo_unit: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Qtd inicial</label>
            <input className="form-input" type="number" value={form.qtd_atual} onChange={e => setForm({ ...form, qtd_atual: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Qtd mínima (alerta)</label>
            <input className="form-input" type="number" value={form.qtd_minima} onChange={e => setForm({ ...form, qtd_minima: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalNovo(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={salvarItem}>Salvar</button>
        </div>
      </Modal>

      {/* Modal editar item */}
      {editando && (
        <Modal title={`Editar — ${editando.nome}`} open={!!editando} onClose={() => setEditando(null)}>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome do item</label>
              <input className="form-input" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoria</label>
              <input className="form-input" value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unidade</label>
              <select className="form-input" value={editForm.unidade} onChange={e => setEditForm({ ...editForm, unidade: e.target.value })}>
                <option>un</option><option>rolo</option><option>kg</option><option>m</option><option>cx</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Custo unitário (R$)</label>
              <input className="form-input" type="number" value={editForm.custo_unit} onChange={e => setEditForm({ ...editForm, custo_unit: e.target.value })} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Qtd mínima (alerta)</label>
              <input className="form-input" type="number" value={editForm.qtd_minima} onChange={e => setEditForm({ ...editForm, qtd_minima: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={salvarEdicao}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal movimentação */}
      {modalMov && (
        <Modal
          title={`${movForm.tipo === 'entrada' ? 'Entrada' : 'Saída'} — ${modalMov.nome}`}
          open={!!modalMov}
          onClose={() => setModalMov(null)}
        >
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--bg4)', borderRadius: 'var(--radius)', fontSize: 13 }}>
            Saldo atual: <strong>{Number(modalMov.qtd_atual)} {modalMov.unidade}</strong>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo</label>
              <select className="form-input" value={movForm.tipo} onChange={e => setMovForm({ ...movForm, tipo: e.target.value })}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quantidade</label>
              <input className="form-input" type="number" value={movForm.quantidade} onChange={e => setMovForm({ ...movForm, quantidade: e.target.value })} />
            </div>
          </div>
          <div className="form-row single" style={{ marginTop: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observação</label>
              <input className="form-input" value={movForm.observacao} onChange={e => setMovForm({ ...movForm, observacao: e.target.value })} placeholder="Ex: Usado na venda #3" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline btn-sm" onClick={() => setModalMov(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={registrarMovimento}>Registrar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
