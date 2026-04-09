import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from './Modal'
import { maskTelefone, maskValor, parseMaskedValor } from '../utils/masks'

const TITLES = { cliente: 'Novo Cliente', fornecedor: 'Novo Fornecedor', servico: 'Novo Serviço' }

export default function QuickAddModal({ type, open, onClose, onSaved }) {
  const { addCliente, addFornecedor, addServico } = useData()
  const { showToast } = useToast()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [categoria, setCategoria] = useState('')
  const [valorPadrao, setValorPadrao] = useState('')

  function reset() {
    setNome(''); setTelefone(''); setCategoria(''); setValorPadrao('')
  }

  function handleClose() { reset(); onClose() }

  async function handleSave() {
    if (!nome.trim()) return showToast('Nome é obrigatório', 'danger')
    try {
      let novo
      if (type === 'cliente') {
        novo = await addCliente({
          nome: nome.trim(), telefone, email: '',
          initials: nome.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
        })
        showToast('Cliente cadastrado!', 'success')
      } else if (type === 'fornecedor') {
        novo = await addFornecedor({ nome: nome.trim(), telefone, categoria })
        showToast('Fornecedor cadastrado!', 'success')
      } else if (type === 'servico') {
        novo = await addServico({ nome: nome.trim(), valor_padrao: parseMaskedValor(valorPadrao), custo_min: 0 })
        showToast('Serviço cadastrado!', 'success')
      }
      onSaved?.(novo)
      handleClose()
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  return (
    <Modal title={TITLES[type] ?? 'Novo Cadastro'} open={open} onClose={handleClose}>
      <div className="form-group">
        <label className="form-label">Nome</label>
        <input
          className="form-input"
          value={nome}
          autoFocus
          placeholder="Nome..."
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
      </div>

      {(type === 'cliente' || type === 'fornecedor') && (
        <div className="form-group">
          <label className="form-label">Telefone</label>
          <input
            className="form-input"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={e => setTelefone(maskTelefone(e.target.value))}
          />
        </div>
      )}

      {type === 'fornecedor' && (
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <input
            className="form-input"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            placeholder="Ex: Hardware, Elétrica"
          />
        </div>
      )}

      {type === 'servico' && (
        <div className="form-group">
          <label className="form-label">Valor Padrão (R$)</label>
          <input
            className="form-input"
            inputMode="decimal"
            placeholder="0,00"
            value={valorPadrao}
            onChange={e => setValorPadrao(maskValor(e.target.value))}
          />
        </div>
      )}

      <div className="modal-footer">
        <button className="btn btn-outline btn-sm" onClick={handleClose}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>Salvar</button>
      </div>
    </Modal>
  )
}
