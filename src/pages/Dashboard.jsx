import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import WaButton from '../components/WaButton'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function ultimos6Meses() {
  const hoje = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1)
    return { label: MESES[d.getMonth()], ano: d.getFullYear(), mesIdx: d.getMonth() }
  })
}

function ultimos7Dias() {
  const hoje = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setHours(0,0,0,0)
    d.setDate(hoje.getDate() - 6 + i)
    return { label: DIAS[d.getDay()], data: d }
  })
}

function mesesAno() {
  const ano = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => ({
    label: MESES[i], ano, mesIdx: i,
  }))
}

function inicioPeriodo(filtro) {
  const d = new Date()
  d.setHours(0,0,0,0)
  if (filtro === 'semana') { d.setDate(d.getDate() - 6); return d }
  if (filtro === 'mes')    { d.setDate(1); return d }
  if (filtro === 'ano')    { d.setMonth(0,1); return d }
  return d
}

function diasAtraso(vencimento) {
  if (!vencimento) return 0
  // Suporta "dd/mm/yyyy" e "yyyy-mm-dd"
  let d
  if (typeof vencimento === 'string' && vencimento.includes('/')) {
    const [dia, mes, ano] = vencimento.split('/')
    d = new Date(`${ano}-${mes}-${dia}`)
  } else {
    d = new Date(vencimento)
  }
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  return diff > 0 ? diff : 0
}

function statusLabel(s) {
  const map = { orcamento: 'Orçamento', aprovado: 'Aprovado', andamento: 'Em andamento', concluido: 'Concluído', recebido: 'Recebido', vencido: 'Vencido', pago: 'Pago', pendente: 'Pendente' }
  return map[s] || s
}

export default function Dashboard() {
  const [filtro, setFiltro] = useState('mes')
  const { vendas, contasReceber } = useData()
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  // Indicadores de inadimplência por faixa de dias
  const inadimplencia = useMemo(() => {
    const vencidas = (contasReceber ?? []).filter(c => c.status === 'vencido' || (diasAtraso(c.vencimento) > 0 && c.status !== 'pago'))
    const faixas = [
      { label: 'Até 7 dias', min: 1,  max: 7,   cor: 'amber' },
      { label: '8–15 dias',  min: 8,  max: 15,  cor: 'red'   },
      { label: '16–30 dias', min: 16, max: 30,  cor: 'red'   },
      { label: 'Acima de 30', min: 31, max: 9999, cor: 'red' },
    ]
    return faixas.map(f => {
      const itens = vencidas.filter(c => {
        const d = diasAtraso(c.vencimento)
        return d >= f.min && d <= f.max
      })
      return { ...f, total: itens.reduce((s, c) => s + Number(c.valor), 0), itens }
    })
  }, [contasReceber])

  const totalVencido = inadimplencia.reduce((s, f) => s + f.total, 0)
  const vencidasAll  = (contasReceber ?? []).filter(c => diasAtraso(c.vencimento) > 0 && c.status !== 'pago')

  // Filtra vendas pelo período selecionado
  const vendasFiltradas = useMemo(() => {
    const inicio = inicioPeriodo(filtro)
    return (vendas ?? []).filter(v => {
      const d = new Date(v.criado_em ?? v.created_at ?? 0)
      return d >= inicio
    })
  }, [vendas, filtro])

  const ultimos = vendasFiltradas.slice(0, 4)

  // Filtra contas a receber pelo período
  const receberFiltradas = useMemo(() => {
    const inicio = inicioPeriodo(filtro)
    return (contasReceber ?? []).filter(c => {
      const d = new Date(c.criado_em ?? c.created_at ?? 0)
      return d >= inicio
    })
  }, [contasReceber, filtro])

  const totalReceber = receberFiltradas.filter(c => c.status !== 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const totalRecebido = receberFiltradas.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)

  // ── Gráfico: barras dinâmicas conforme filtro ──
  const chartData = useMemo(() => {
    let barras = []

    if (filtro === 'semana') {
      const dias = ultimos7Dias()
      barras = dias.map(({ label, data }) => {
        const proximo = new Date(data); proximo.setDate(data.getDate() + 1)
        const total = (vendas ?? []).reduce((s, v) => {
          const d = new Date(v.criado_em ?? v.created_at ?? 0)
          return d >= data && d < proximo ? s + Number(v.valor) : s
        }, 0)
        return { mes: label, total }
      })
    } else if (filtro === 'ano') {
      barras = mesesAno().map(({ label, ano, mesIdx }) => {
        const total = (vendas ?? []).reduce((s, v) => {
          const d = new Date(v.criado_em ?? v.created_at ?? 0)
          return d.getMonth() === mesIdx && d.getFullYear() === ano ? s + Number(v.valor) : s
        }, 0)
        return { mes: label, total }
      })
    } else {
      // mes: últimos 6 meses
      barras = ultimos6Meses().map(({ label, ano, mesIdx }) => {
        const total = (vendas ?? []).reduce((s, v) => {
          const d = new Date(v.criado_em ?? v.created_at ?? 0)
          return d.getMonth() === mesIdx && d.getFullYear() === ano ? s + Number(v.valor) : s
        }, 0)
        return { mes: label, total }
      })
    }

    const max = Math.max(...barras.map(t => t.total), 1)
    const atual = barras[barras.length - 1]
    const anterior = barras[barras.length - 2]
    const variacao = anterior?.total > 0
      ? Math.round(((atual.total - anterior.total) / anterior.total) * 100)
      : null
    return { barras: barras.map(t => ({ ...t, pct: Math.max((t.total / max) * 100, 3) })), variacao }
  }, [vendas, filtro])

  // ── Status dos Serviços: filtrado por período ──
  const totalVendasFiltradas = vendasFiltradas.length || 1
  const statusServicos = useMemo(() => [
    { label: 'Em andamento', key: 'andamento', cls: 'amber' },
    { label: 'Concluídos',   key: 'concluido', cls: 'green' },
    { label: 'Orçamentos',   key: 'orcamento', cls: ''      },
    { label: 'Recebidos',    key: 'recebido',  cls: ''      },
  ].map(s => {
    const count = vendasFiltradas.filter(v => v.status === s.key || v.kanban_status === s.key).length
    return { ...s, count, pct: Math.round((count / totalVendasFiltradas) * 100) }
  }), [vendasFiltradas])

  return (
    <div id="page-dashboard">
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-sub">Visão geral do seu negócio</div>
        </div>
        <div className="topbar-actions">
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            {['semana', 'mes', 'ano'].map(f => (
              <button key={f} className={`filter-btn${filtro === f ? ' active' : ''}`} onClick={() => setFiltro(f)}>
                {f === 'semana' ? 'Semana' : f === 'mes' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="content">

        {/* ── Alerta de inadimplência com cobranças rápidas ── */}
        {totalVencido > 0 && (
          <div className="alert-box danger mb-16">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div className="alert-title">R$ {totalVencido.toFixed(2).replace('.', ',')} em atraso</div>
              <div className="alert-text">{vencidasAll.length} cliente(s) com pagamentos vencidos — envie cobrança via WhatsApp agora</div>
              <div className="alert-actions">
                {vencidasAll.slice(0, 3).map(c => (
                  <WaButton
                    key={c.id}
                    nome={c.cliente_nome}
                    telefone={c.telefone}
                    mensagem={`Olá ${c.cliente_nome?.split(' ')[0]}! Identificamos R$ ${Number(c.valor).toFixed(2)} em aberto (${c.referente}). Por favor, regularize o pagamento. — ControlCA$H`}
                    label={`Cobrar ${c.cliente_nome?.split(' ')[0]} (R$ ${Number(c.valor).toFixed(2)})`}
                    userId={currentUser?.id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Cards de inadimplência por faixa (7 / 15 / 30 dias) ── */}
        <div className="grid-2 mb-16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {inadimplencia.map(f => (
            <div key={f.label} className={`metric-card${f.total > 0 ? ` ${f.cor}` : ''}`}
              style={{ cursor: f.total > 0 ? 'pointer' : 'default' }}
              onClick={() => f.total > 0 && navigate('/relatorios')}
            >
              <div className="metric-label">Atraso: {f.label}</div>
              <div className={`metric-value${f.total > 0 ? ` ${f.cor}` : ''}`}>
                {f.total > 0 ? `R$ ${f.total.toFixed(2).replace('.', ',')}` : '—'}
              </div>
              <div className="metric-delta">
                {f.itens.length > 0 ? `${f.itens.length} lançamento(s)` : 'Sem atrasos nessa faixa'}
              </div>
            </div>
          ))}
        </div>

        {/* ── Métricas gerais ── */}
        <div className="metrics-grid mb-16">
          <div className="metric-card">
            <div className="metric-label">Serviços {filtro === 'semana' ? 'da Semana' : filtro === 'mes' ? 'do Mês' : 'do Ano'}</div>
            <div className="metric-value">{vendasFiltradas.length}</div>
            <div className="metric-delta">{(vendas ?? []).length} no total</div>
          </div>
          <div className="metric-card green">
            <div className="metric-label">Recebido</div>
            <div className="metric-value green">R$ {totalRecebido.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{receberFiltradas.filter(c => c.status === 'pago').length} recebido(s)</div>
          </div>
          <div className="metric-card amber">
            <div className="metric-label">A Receber</div>
            <div className="metric-value amber">R$ {totalReceber.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{receberFiltradas.filter(c => c.status !== 'pago').length} em aberto</div>
          </div>
          <div className="metric-card red">
            <div className="metric-label">Em Atraso</div>
            <div className="metric-value red">R$ {totalVencido.toFixed(2).replace('.', ',')}</div>
            <div className="metric-delta">{vencidasAll.length} lançamento(s)</div>
          </div>
        </div>

        <div className="grid-2 mb-16">
          {/* Gráfico */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Receita {filtro === 'semana' ? 'por Dia (7 dias)' : filtro === 'mes' ? 'por Mês (6 meses)' : 'por Mês (ano)'}</div>
            </div>
            <div className="chart-bars">
              {chartData.barras.map(({ mes, pct, total }, i) => {
                const isAtual = i === chartData.barras.length - 1
                return (
                  <div key={mes} className="chart-bar-wrap" title={`R$ ${total.toFixed(2).replace('.', ',')}`}>
                    {total > 0 && <div className="chart-bar-value">R$ {total >= 1000 ? (total/1000).toFixed(1) + 'k' : total.toFixed(0)}</div>}
                    <div className="chart-bar" style={{
                      height: `${Math.max(pct, total > 0 ? 8 : 3)}%`,
                      background: isAtual ? 'var(--purple)' : total > 0 ? 'var(--purple-l)' : 'var(--bg3)',
                    }} />
                    <div className="chart-bar-label">{mes}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-xs)' }}>
                {chartData.barras[0]?.mes} — {chartData.barras[chartData.barras.length - 1]?.mes}
              </span>
              {chartData.variacao !== null && (
                <span style={{ fontSize: 11, fontWeight: 600, color: chartData.variacao >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {chartData.variacao >= 0 ? '↑' : '↓'} {Math.abs(chartData.variacao)}% vs anterior
                </span>
              )}
            </div>
          </div>

          {/* Status serviços */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Status dos Serviços</div>
            </div>
            <div>
              {statusServicos.map(({ label, count, pct, cls }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-s)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Últimos serviços */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Últimos Serviços</div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/vendas')}>Ver todos</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Pagamento</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {ultimos.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-s)', padding: 24 }}>Nenhum serviço neste período</td></tr>
                ) : ultimos.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div className="flex items-center gap-8">
                        <div className="avatar">{v.initials}</div>
                        {v.cliente_nome ?? v.cliente}
                      </div>
                    </td>
                    <td>{v.servico}</td>
                    <td className="td-bold">R$ {Number(v.valor).toFixed(2).replace('.', ',')}</td>
                    <td>{v.pagamento}</td>
                    <td><span className={`status status-${v.status}`}>{statusLabel(v.status)}</span></td>
                    <td>
                      {v.status === 'vencido' && (
                        <WaButton
                          nome={v.cliente_nome ?? v.cliente}
                          telefone={v.telefone}
                          mensagem={`Olá! Seu pagamento de R$ ${Number(v.valor).toFixed(2)} está vencido. Entre em contato para regularizar. — ControlCA$H`}
                          label="Cobrar"
                          userId={currentUser?.id}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
