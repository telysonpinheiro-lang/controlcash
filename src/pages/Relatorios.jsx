import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Pagination, { usePagination } from '../components/Pagination'
import { exportCSV } from '../utils/exportCSV'
import { exportPDF } from '../utils/exportPDF'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost/virtualcore-react/backend/api'

const CORES_FAIXA = {
  'A vencer':       'var(--blue)',
  '1-30 dias':      'var(--amber)',
  '31-60 dias':     '#f97316',
  '61-90 dias':     'var(--red)',
  'Acima de 90 dias':'#7f1d1d',
}

export default function Relatorios() {
  const { currentUser } = useAuth()
  const { showToast }   = useToast()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Hook SEMPRE chamado, independente do loading
  const pgLancamentos = usePagination(data?.lancamentos ?? [])
  const total = data?.total_geral ?? 0

  const headers = { 'X-User-Id': currentUser?.id, 'X-User-Role': currentUser?.role }

  async function carregar() {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/relatorios/inadimplencia.php?usuario_id=${currentUser?.id}`,
        { headers }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar')
      setData(json)
    } catch (e) {
      showToast('Erro ao carregar relatório', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  if (loading) return (
    <div id="page-relatorios">
      <div className="topbar">
        <div><div className="topbar-title">Relatórios</div></div>
      </div>
      <div className="content">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-s)' }}>Carregando...</div>
      </div>
    </div>
  )

  return (
    <div id="page-relatorios">
      <div className="topbar">
        <div>
          <div className="topbar-title">Relatório de Inadimplência</div>
          <div className="topbar-sub">Aging report · Gerado em {data?.gerado_em}</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => exportCSV(data?.lancamentos ?? [], 'inadimplencia')}>
            ⬇ CSV
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => exportPDF(
            data?.lancamentos ?? [],
            'inadimplencia',
            ['cliente_nome', 'referente', 'valor', 'vencimento', 'dias_atraso_atual', 'faixa_atraso', 'status'],
            ['Cliente', 'Referente', 'Valor (R$)', 'Vencimento', 'Dias atraso', 'Faixa', 'Status'],
            'Relatório de Inadimplência'
          )}>
            ⬇ PDF
          </button>
          <button className="btn btn-sm btn-outline" onClick={carregar}>↺ Atualizar</button>
        </div>
      </div>

      <div className="content">
        {/* Resumo por faixa */}
        <div className="grid-2 mb-16">
          <div className="card">
            <div className="card-header"><div className="card-title">Aging Report — Por faixa de atraso</div></div>
            <div>
              {(data?.resumo_faixas ?? []).map(f => {
                const pct = total > 0 ? Math.round((f.total / total) * 100) : 0
                return (
                  <div key={f.faixa} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: CORES_FAIXA[f.faixa] ?? 'var(--text)' }}>{f.faixa}</span>
                      <span style={{ color: 'var(--text-s)' }}>
                        {f.quantidade} parcela(s) · <strong>R$ {Number(f.total).toFixed(2).replace('.', ',')}</strong>
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: CORES_FAIXA[f.faixa] ?? 'var(--purple)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, color: 'var(--purple-d)', fontSize: 13 }}>Total em aberto</span>
              <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: 15 }}>
                R$ {Number(total).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Top devedores */}
          <div className="card">
            <div className="card-header"><div className="card-title">Top Devedores (vencidos)</div></div>
            {(data?.top_devedores ?? []).length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-s)', fontSize: 13 }}>
                Nenhuma inadimplência registrada
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Cliente</th><th>Parcelas</th><th>Total devido</th></tr>
                  </thead>
                  <tbody>
                    {data.top_devedores.map((d, i) => (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-8">
                            <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                              {d.cliente_nome.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            {d.cliente_nome}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-s)' }}>{d.qtd_parcelas}x</td>
                        <td className="td-bold" style={{ color: 'var(--red)' }}>
                          R$ {Number(d.total_devido).toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detalhamento completo */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Detalhamento — Todos os lançamentos em aberto</div>
            <span style={{ fontSize: 12, color: 'var(--text-s)' }}>
              {data?.lancamentos?.length ?? 0} lançamentos
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Referente</th><th>Valor</th>
                  <th>Vencimento</th><th>Dias em atraso</th><th>Faixa</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pgLancamentos.paginated.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-8">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                          {(l.initials ?? l.cliente_nome?.slice(0, 2) ?? '--').toUpperCase()}
                        </div>
                        {l.cliente_nome}
                      </div>
                    </td>
                    <td>{l.referente}</td>
                    <td className="td-bold">R$ {Number(l.valor).toFixed(2).replace('.', ',')}</td>
                    <td>{l.vencimento}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: Number(l.dias_atraso_atual) > 0 ? 'var(--red)' : 'var(--text-s)',
                      }}>
                        {Number(l.dias_atraso_atual) > 0 ? `${l.dias_atraso_atual}d` : 'A vencer'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: 'var(--red-bg)', color: CORES_FAIXA[l.faixa_atraso] ?? 'var(--text)',
                      }}>
                        {l.faixa_atraso}
                      </span>
                    </td>
                    <td>
                      <span className={`status status-${l.status}`}>
                        {l.status === 'vencido' ? 'Vencido' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pgLancamentos.page} totalPages={pgLancamentos.totalPages} total={pgLancamentos.total} perPage={pgLancamentos.perPage} onPageChange={pgLancamentos.goTo} onPerPageChange={pgLancamentos.changePerPage} />
        </div>
      </div>
    </div>
  )
}
