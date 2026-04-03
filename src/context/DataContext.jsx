import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  vendasApi, pagarApi, receberApi, contratosApi,
  clientesApi, fornecedoresApi, servicosApi, adminApi,
} from '../services/api'

const DataContext = createContext(null)

function useResource(fetchFn) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchFn())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])          // fetchFn é estável (funções do api.js não mudam)

  useEffect(() => { load() }, [load])

  return { data, setData, loading, error, reload: load }
}

export function DataProvider({ children }) {
  const vendas        = useResource(vendasApi.list)
  const contasPagar   = useResource(pagarApi.list)
  const contasReceber = useResource(receberApi.list)
  const contratos     = useResource(contratosApi.list)
  const clientes      = useResource(clientesApi.list)
  const fornecedores  = useResource(fornecedoresApi.list)
  const servicos      = useResource(servicosApi.list)
  const adminCli      = useResource(adminApi.list)

  // ── Auto-arquivar recebidos há mais de 1 mês (executa apenas 1x) ──
  const autoArquivouRef = useRef(false)
  useEffect(() => {
    if (vendas.loading || contasReceber.loading || autoArquivouRef.current) return
    autoArquivouRef.current = true

    const umMesAtras = new Date()
    umMesAtras.setMonth(umMesAtras.getMonth() - 1)

    // Vendas recebidas há mais de 1 mês
    vendas.data.forEach(v => {
      if (v.kanban_status === 'recebido' && !Number(v.arquivado)) {
        const d = new Date(v.criado_em ?? v.created_at ?? 0)
        if (d < umMesAtras) {
          vendasApi.update(v.id, {
            cliente_nome: v.cliente_nome, servico: v.servico, valor: v.valor,
            material: v.material, pagamento: v.pagamento, prazo: v.prazo,
            prazo_pagamento: v.prazo_pagamento,
            status: v.status, kanban_status: v.kanban_status, arquivado: 1,
          }).then(() => vendas.setData(prev => prev.map(x => x.id === v.id ? { ...x, arquivado: 1 } : x)))
            .catch(e => console.warn('Auto-arquivar:', e.message))
        }
      }
    })

    // Contas a receber pagas há mais de 1 mês
    contasReceber.data.forEach(c => {
      if (c.status === 'pago' && !Number(c.arquivado)) {
        const d = new Date(c.criado_em ?? c.created_at ?? 0)
        if (d < umMesAtras) {
          receberApi.update(c.id, { arquivado: 1 })
            .then(() => contasReceber.setData(prev => prev.map(x => x.id === c.id ? { ...x, arquivado: 1 } : x)))
            .catch(e => console.warn('Auto-arquivar:', e.message))
        }
      }
    })
  }, [vendas.loading, contasReceber.loading])

  // ── Vendas ──────────────────────────────────────────────
  async function addVenda(payload) {
    const novo = await vendasApi.create(payload)
    vendas.setData(prev => [novo, ...prev])
    return novo
  }

  async function updateVenda(id, payload) {
    const atualizado = await vendasApi.update(id, payload)
    vendas.setData(prev => prev.map(v => v.id === id ? atualizado : v))
    return atualizado
  }

  async function removeVenda(id) {
    await vendasApi.remove(id)
    vendas.setData(prev => prev.filter(v => v.id !== id))
    contasReceber.reload()
  }

  // ── Contas a Pagar ────────────────────────────────────────
  async function addContaPagar(payload) {
    const novo = await pagarApi.create(payload)
    contasPagar.setData(prev => [novo, ...prev])
    return novo
  }

  async function updateContaPagar(id, payload) {
    const atualizado = await pagarApi.update(id, payload)
    contasPagar.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  async function removeContaPagar(id) {
    await pagarApi.remove(id)
    contasPagar.setData(prev => prev.filter(c => c.id !== id))
  }

  async function marcarPago(id) {
    const atualizado = await pagarApi.marcarPago(id)
    contasPagar.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  // ── Contas a Receber ──────────────────────────────────────
  async function addContaReceber(payload) {
    const novo = await receberApi.create(payload)
    contasReceber.setData(prev => [novo, ...prev])
    return novo
  }

  async function updateContaReceber(id, payload) {
    const atualizado = await receberApi.update(id, payload)
    contasReceber.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  async function removeContaReceber(id) {
    await receberApi.remove(id)
    contasReceber.setData(prev => prev.filter(c => c.id !== id))
  }

  async function confirmarRecebimento(id) {
    const atualizado = await receberApi.confirmar(id)
    contasReceber.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  // ── Contratos ─────────────────────────────────────────────
  async function addContrato(payload) {
    const novo = await contratosApi.create(payload)
    contratos.setData(prev => [novo, ...prev])
    return novo
  }

  async function updateContrato(id, payload) {
    const atualizado = await contratosApi.update(id, payload)
    contratos.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  async function removeContrato(id) {
    await contratosApi.remove(id)
    contratos.setData(prev => prev.filter(c => c.id !== id))
  }

  // ── Clientes ──────────────────────────────────────────────
  async function addCliente(payload) {
    const novo = await clientesApi.create(payload)
    clientes.setData(prev => [...prev, novo])
    return novo
  }

  async function updateCliente(id, payload) {
    const atualizado = await clientesApi.update(id, payload)
    clientes.setData(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  async function removeCliente(id) {
    await clientesApi.remove(id)
    clientes.setData(prev => prev.filter(c => c.id !== id))
    vendas.reload(); contasReceber.reload(); contratos.reload()
  }

  // ── Fornecedores ──────────────────────────────────────────
  async function addFornecedor(payload) {
    const novo = await fornecedoresApi.create(payload)
    fornecedores.setData(prev => [...prev, novo])
    return novo
  }

  async function updateFornecedor(id, payload) {
    const atualizado = await fornecedoresApi.update(id, payload)
    fornecedores.setData(prev => prev.map(f => f.id === id ? atualizado : f))
  }

  async function removeFornecedor(id) {
    await fornecedoresApi.remove(id)
    fornecedores.setData(prev => prev.filter(f => f.id !== id))
  }

  // ── Serviços ──────────────────────────────────────────────
  async function addServico(payload) {
    const novo = await servicosApi.create(payload)
    servicos.setData(prev => [...prev, novo])
    return novo
  }

  async function updateServico(id, payload) {
    const atualizado = await servicosApi.update(id, payload)
    servicos.setData(prev => prev.map(s => s.id === id ? atualizado : s))
  }

  async function removeServico(id) {
    await servicosApi.remove(id)
    servicos.setData(prev => prev.filter(s => s.id !== id))
    vendas.reload(); contasReceber.reload(); contratos.reload()
  }

  // ── Admin ─────────────────────────────────────────────────
  async function addAdminCliente(payload) {
    const novo = await adminApi.create(payload)
    adminCli.setData(prev => [...prev, novo])
    return novo
  }

  async function updateAdminCliente(id, payload) {
    const atualizado = await adminApi.update(id, payload)
    adminCli.setData(prev => prev.map(c => c.id === id ? atualizado : c))
    return atualizado
  }

  async function removeAdminCliente(id) {
    await adminApi.remove(id)
    adminCli.setData(prev => prev.filter(c => c.id !== id))
  }

  return (
    <DataContext.Provider value={{
      // dados
      vendas:        vendas.data,
      contasPagar:   contasPagar.data,
      contasReceber: contasReceber.data,
      contratos:     contratos.data,
      clientes:      clientes.data,
      fornecedores:  fornecedores.data,
      servicos:      servicos.data,
      adminClientes: adminCli.data,

      // estados de carregamento
      loading: {
        vendas:        vendas.loading,
        contasPagar:   contasPagar.loading,
        contasReceber: contasReceber.loading,
        contratos:     contratos.loading,
        clientes:      clientes.loading,
        fornecedores:  fornecedores.loading,
        servicos:      servicos.loading,
        adminClientes: adminCli.loading,
      },

      // erros
      errors: {
        vendas:        vendas.error,
        contasPagar:   contasPagar.error,
        contasReceber: contasReceber.error,
        contratos:     contratos.error,
        clientes:      clientes.error,
        fornecedores:  fornecedores.error,
        servicos:      servicos.error,
        adminClientes: adminCli.error,
      },

      // operações
      addVenda, updateVenda, removeVenda,
      addContaPagar, updateContaPagar, removeContaPagar, marcarPago,
      addContaReceber, updateContaReceber, removeContaReceber, confirmarRecebimento,
      addContrato, updateContrato, removeContrato,
      addCliente, updateCliente, removeCliente,
      addFornecedor, updateFornecedor, removeFornecedor,
      addServico, updateServico, removeServico,
      addAdminCliente, updateAdminCliente, removeAdminCliente,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
