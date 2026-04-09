import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { maskTelefone, maskCEP, maskValor, parseMaskedValor, numToMasked } from '../utils/masks'

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
  </svg>
)

export default function Cadastros() {
  const { clientes, fornecedores, servicos, addCliente, updateCliente, removeCliente, addFornecedor, updateFornecedor, removeFornecedor, addServico, updateServico, removeServico } = useData()
  const { showToast } = useToast()
  const [aba, setAba] = useState('clientes')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFornecedor, setModalFornecedor] = useState(false)
  const [modalServico, setModalServico] = useState(false)
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', email: '', rua: '', bairro: '', cidade: '', cep: '' })
  const [formFornecedor, setFormFornecedor] = useState({ nome: '', telefone: '', categoria: '' })
  const [formServico, setFormServico] = useState({ nome: '', valorPadrao: '', custoMin: '' })

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  )
  const pgClientes = usePagination(clientesFiltrados)
  const pgFornecedores = usePagination(fornecedores)
  const pgServicos = usePagination(servicos)

  function abrirEdicao(c) {
    setEditando(c)
    setFormCliente({ nome: c.nome, telefone: c.telefone || '', email: c.email || '', rua: c.rua || '', bairro: c.bairro || '', cidade: c.cidade || '', cep: c.cep || '' })
    setModalOpen(true)
  }

  async function handleSalvarCliente() {
    if (!formCliente.nome) return showToast('Nome é obrigatório', 'danger')
    try {
      if (editando) {
        await updateCliente(editando.id, formCliente)
        showToast('Cliente atualizado!', 'success')
      } else {
        await addCliente({ ...formCliente, initials: formCliente.nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() })
        showToast('Cliente cadastrado!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setFormCliente({ nome: '', telefone: '', email: '', rua: '', bairro: '', cidade: '', cep: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  function abrirEdicaoFornecedor(f) {
    setEditando(f)
    setFormFornecedor({ nome: f.nome, telefone: f.telefone || '', categoria: f.categoria || '' })
    setModalFornecedor(true)
  }

  async function handleSalvarFornecedor() {
    if (!formFornecedor.nome) return showToast('Nome é obrigatório', 'danger')
    try {
      if (editando) {
        await updateFornecedor(editando.id, formFornecedor)
        showToast('Fornecedor atualizado!', 'success')
      } else {
        await addFornecedor(formFornecedor)
        showToast('Fornecedor cadastrado!', 'success')
      }
      setModalFornecedor(false)
      setEditando(null)
      setFormFornecedor({ nome: '', telefone: '', categoria: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  function abrirEdicaoServico(s) {
    setEditando(s)
    setFormServico({ nome: s.nome, valorPadrao: numToMasked(s.valor_padrao ?? s.valorPadrao ?? 0), custoMin: numToMasked(s.custo_min ?? s.custoMin ?? 0) })
    setModalServico(true)
  }

  async function handleSalvarServico() {
    if (!formServico.nome) return showToast('Nome é obrigatório', 'danger')
    const vp = parseMaskedValor(formServico.valorPadrao)
    const cm = parseMaskedValor(formServico.custoMin)
    try {
      if (editando) {
        await updateServico(editando.id, { nome: formServico.nome, valor_padrao: vp, custo_min: cm })
        showToast('Serviço atualizado!', 'success')
      } else {
        await addServico({ nome: formServico.nome, valor_padrao: vp, custo_min: cm })
        showToast('Serviço cadastrado!', 'success')
      }
      setModalServico(false)
      setEditando(null)
      setFormServico({ nome: '', valorPadrao: '', custoMin: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  return (
    <div id="page-cadastros">
      <div className="topbar">
        <div>
          <div className="topbar-title">Cadastros</div>
          <div className="topbar-sub">Clientes, fornecedores e serviços</div>
        </div>
      </div>

      <div className="content">
        <div className="filter-bar mb-16">
          {[
            { key: 'clientes', label: 'Clientes' },
            { key: 'fornecedores', label: 'Fornecedores' },
            { key: 'servicos', label: 'Serviços' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn${aba === key ? ' active' : ''}`}
              onClick={() => { setAba(key); setBusca('') }}
            >
              {label}
            </button>
          ))}
          <div className="filter-sep" />
          {aba === 'servicos' && <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setFormServico({ nome: '', valorPadrao: '', custoMin: '' }); setModalServico(true) }}>+ Novo Serviço</button>}
          {aba === 'fornecedores' && <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setFormFornecedor({ nome: '', telefone: '', categoria: '' }); setModalFornecedor(true) }}>+ Novo Fornecedor</button>}
          {aba === 'clientes' && <button className="btn btn-primary btn-sm" onClick={() => { setEditando(null); setFormCliente({ nome: '', telefone: '', email: '', rua: '', bairro: '', cidade: '', cep: '' }); setModalOpen(true) }}>+ Novo Cliente</button>}
        </div>

        {/* Clientes */}
        {aba === 'clientes' && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Clientes</div>
              <input
                className="form-input"
                style={{ width: 200, padding: '6px 12px', fontSize: 12 }}
                placeholder="Buscar..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Endereço</th><th>CEP</th><th>Serviços</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {pgClientes.paginated.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-8">
                          <div className="avatar">{c.initials}</div>
                          {c.nome}
                        </div>
                      </td>
                      <td>{c.telefone}</td>
                      <td>{c.email}</td>
                      <td style={{fontSize:12}}>{[c.rua, c.bairro, c.cidade].filter(Boolean).join(' — ') || c.endereco || '—'}</td>
                      <td style={{fontSize:12}}>{c.cep || '—'}</td>
                      <td><span className="tag">{c.totalServicos} serviço(s)</span></td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn-icon" onClick={() => abrirEdicao(c)}><EditIcon /></button>
                          <button className="btn-icon btn-danger" onClick={() => { removeCliente(c.id); showToast('Cliente removido', 'success') }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pgClientes.page} totalPages={pgClientes.totalPages} total={pgClientes.total} perPage={pgClientes.perPage} onPageChange={pgClientes.goTo} onPerPageChange={pgClientes.changePerPage} />
          </div>
        )}

        {/* Fornecedores */}
        {aba === 'fornecedores' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Fornecedores de Materiais</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>Telefone</th><th>Categoria</th><th>Ações</th></tr></thead>
                <tbody>
                  {pgFornecedores.paginated.map(f => (
                    <tr key={f.id}>
                      <td className="td-bold">{f.nome}</td>
                      <td>{f.telefone}</td>
                      <td><span className="tag">{f.categoria}</span></td>
                      <td>
                        <button className="btn-icon" onClick={() => abrirEdicaoFornecedor(f)}><EditIcon /></button>
                        <button className="btn-icon btn-danger" onClick={() => { if (confirm(`Excluir fornecedor "${f.nome}"?`)) removeFornecedor(f.id).catch(e => showToast(e.message, 'danger')) }}><TrashIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pgFornecedores.page} totalPages={pgFornecedores.totalPages} total={pgFornecedores.total} perPage={pgFornecedores.perPage} onPageChange={pgFornecedores.goTo} onPerPageChange={pgFornecedores.changePerPage} />
          </div>
        )}

        {/* Serviços */}
        {aba === 'servicos' && (
          <div className="card">
            <div className="card-header"><div className="card-title">Catálogo de Serviços</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Serviço</th><th>Valor Padrão</th><th>Custo Mín.</th><th>Margem</th><th>Ações</th></tr></thead>
                <tbody>
                  {pgServicos.paginated.map(s => (
                    <tr key={s.id}>
                      <td className="td-bold">{s.nome}</td>
                      <td>R$ {Number(s.valor_padrao ?? s.valorPadrao ?? 0).toFixed(2).replace('.', ',')}</td>
                      <td>R$ {Number(s.custo_min ?? s.custoMin ?? 0).toFixed(2).replace('.', ',')}</td>
                      <td><span style={{ color: 'var(--green)', fontWeight: 600 }}>{s.margem}%</span></td>
                      <td>
                        <div className="flex gap-8">
                          <button className="btn-icon" onClick={() => abrirEdicaoServico(s)}><EditIcon /></button>
                          <button className="btn-icon btn-danger" onClick={() => { if (confirm(`Excluir serviço "${s.nome}"?`)) removeServico(s.id).catch(e => showToast(e.message, 'danger')) }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pgServicos.page} totalPages={pgServicos.totalPages} total={pgServicos.total} perPage={pgServicos.perPage} onPageChange={pgServicos.goTo} onPerPageChange={pgServicos.changePerPage} />
          </div>
        )}
      </div>

      {/* Modal Cliente */}
      <Modal title={editando ? 'Editar Cliente' : 'Novo Cadastro'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setFormCliente({ nome: '', telefone: '', email: '', rua: '', bairro: '', cidade: '', cep: '' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome</label>
            <input className="form-input" value={formCliente.nome} onChange={e => setFormCliente({ ...formCliente, nome: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Telefone</label>
            <input className="form-input" value={formCliente.telefone} onChange={e => setFormCliente({ ...formCliente, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={formCliente.email} onChange={e => setFormCliente({ ...formCliente, email: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Rua / Nº</label>
            <input className="form-input" value={formCliente.rua} onChange={e => setFormCliente({ ...formCliente, rua: e.target.value })} placeholder="Rua das Flores, 123" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Bairro / Cidade</label>
            <input className="form-input" value={formCliente.bairro} onChange={e => setFormCliente({ ...formCliente, bairro: e.target.value })} placeholder="Centro" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cidade</label>
            <input className="form-input" value={formCliente.cidade} onChange={e => setFormCliente({ ...formCliente, cidade: e.target.value })} placeholder="Perdões/MG" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">CEP</label>
            <input className="form-input" value={formCliente.cep} onChange={e => setFormCliente({ ...formCliente, cep: maskCEP(e.target.value) })} placeholder="00000-000" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSalvarCliente}>Salvar</button>
        </div>
      </Modal>

      {/* Modal Fornecedor */}
      <Modal title={editando && modalFornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'} open={modalFornecedor} onClose={() => { setModalFornecedor(false); setEditando(null); setFormFornecedor({ nome: '', telefone: '', categoria: '' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome</label>
            <input className="form-input" value={formFornecedor.nome} onChange={e => setFormFornecedor({ ...formFornecedor, nome: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Telefone</label>
            <input className="form-input" value={formFornecedor.telefone} onChange={e => setFormFornecedor({ ...formFornecedor, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Categoria</label>
            <input className="form-input" value={formFornecedor.categoria} onChange={e => setFormFornecedor({ ...formFornecedor, categoria: e.target.value })} placeholder="Ex: Hardware, Elétrica" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => { setModalFornecedor(false); setEditando(null) }}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSalvarFornecedor}>Salvar</button>
        </div>
      </Modal>

      {/* Modal Serviço */}
      <Modal title={editando && modalServico ? 'Editar Serviço' : 'Novo Serviço'} open={modalServico} onClose={() => { setModalServico(false); setEditando(null); setFormServico({ nome: '', valorPadrao: '', custoMin: '' }) }}>
        <div className="form-row single">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome do Serviço</label>
            <input className="form-input" value={formServico.nome} onChange={e => setFormServico({ ...formServico, nome: e.target.value })} />
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor Padrão (R$)</label>
            <input className="form-input" inputMode="decimal" placeholder="0,00" value={formServico.valorPadrao} onChange={e => setFormServico({ ...formServico, valorPadrao: maskValor(e.target.value) })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Custo Mínimo (R$)</label>
            <input className="form-input" inputMode="decimal" placeholder="0,00" value={formServico.custoMin} onChange={e => setFormServico({ ...formServico, custoMin: maskValor(e.target.value) })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => { setModalServico(false); setEditando(null) }}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSalvarServico}>Salvar</button>
        </div>
      </Modal>
    </div>
  )
}
