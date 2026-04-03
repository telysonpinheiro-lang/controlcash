import { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { notificacoesApi } from '../services/api'

function parseDateBR(str) {
  if (!str) return null
  const parts = str.split('/')
  if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0])
  return new Date(str)
}

function diasAtraso(vencStr) {
  const d = parseDateBR(vencStr)
  if (!d || isNaN(d)) return 0
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const diff = Math.floor((hoje - d) / 86400000)
  return diff > 0 ? diff : 0
}

export default function NotificationBell() {
  const { currentUser } = useAuth()
  const { contasPagar, contasReceber } = useData()
  const [notifsBanco, setNotifsBanco] = useState([])
  const [naoLidasBanco, setNaoLidasBanco] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Busca notificações do banco (manuais/sistema)
  async function carregar() {
    if (!currentUser) return
    try {
      const json = await notificacoesApi.list({ 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role })
      setNotifsBanco(json.notificacoes ?? [])
      setNaoLidasBanco(json.nao_lidas ?? 0)
    } catch (_) {}
  }

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 60_000)
    return () => clearInterval(t)
  }, [currentUser])

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function marcarTodasLidas() {
    await notificacoesApi.marcarTodasLidas({ 'X-User-Id': currentUser.id, 'X-User-Role': currentUser.role })
    setNotifsBanco(n => n.map(x => ({ ...x, lida: 1 })))
    setNaoLidasBanco(0)
  }

  // Gera notificações de atraso a partir dos dados reais (somem quando pago)
  const notifAtraso = useMemo(() => {
    const lista = []

    // Contas a pagar em atraso
    ;(contasPagar ?? []).forEach(c => {
      if (c.status === 'pago') return
      const atraso = diasAtraso(c.vencimento)
      if (atraso > 0) {
        lista.push({
          id: `pagar-${c.id}`,
          tipo: 'vencimento',
          titulo: `Conta a pagar em atraso — ${atraso} dia(s)`,
          mensagem: `${c.fornecedor} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} · Venc: ${c.vencimento}`,
          lida: 0,
          criado_em: c.vencimento,
        })
      }
    })

    // Contas a receber em atraso
    ;(contasReceber ?? []).forEach(c => {
      if (c.status === 'pago') return
      const atraso = diasAtraso(c.vencimento)
      if (atraso > 0) {
        lista.push({
          id: `receber-${c.id}`,
          tipo: 'cobranca',
          titulo: `Conta a receber em atraso — ${atraso} dia(s)`,
          mensagem: `${c.cliente_nome} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} · Venc: ${c.vencimento}`,
          lida: 0,
          criado_em: c.vencimento,
        })
      }
    })

    return lista
  }, [contasPagar, contasReceber])

  // Próximos a vencer (até 7 dias)
  const notifProximas = useMemo(() => {
    const lista = []
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const em7 = new Date(hoje); em7.setDate(hoje.getDate() + 7)

    ;(contasPagar ?? []).forEach(c => {
      if (c.status === 'pago') return
      const d = parseDateBR(c.vencimento)
      if (d && d >= hoje && d <= em7) {
        lista.push({
          id: `pagar-prox-${c.id}`,
          tipo: 'vencimento',
          titulo: `Conta a pagar vence em breve`,
          mensagem: `${c.fornecedor} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} · Venc: ${c.vencimento}`,
          lida: 0,
          criado_em: c.vencimento,
        })
      }
    })

    ;(contasReceber ?? []).forEach(c => {
      if (c.status === 'pago') return
      const d = parseDateBR(c.vencimento)
      if (d && d >= hoje && d <= em7) {
        lista.push({
          id: `receber-prox-${c.id}`,
          tipo: 'cobranca',
          titulo: `Conta a receber vence em breve`,
          mensagem: `${c.cliente_nome} — R$ ${Number(c.valor).toFixed(2).replace('.', ',')} · Venc: ${c.vencimento}`,
          lida: 0,
          criado_em: c.vencimento,
        })
      }
    })

    return lista
  }, [contasPagar, contasReceber])

  // Todas as notificações juntas
  const todasNotifs = [...notifAtraso, ...notifProximas, ...notifsBanco]
  const totalNaoLidas = notifAtraso.length + notifProximas.length + naoLidasBanco

  const iconeCor = { cobranca: '#dc2626', vencimento: '#d97706', sistema: '#7c3aed' }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn-icon" onClick={() => setOpen(o => !o)} style={{ position: 'relative' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {totalNaoLidas > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--red)', color: '#fff',
            fontSize: 9, fontWeight: 700,
            borderRadius: 10, padding: '1px 5px',
            minWidth: 16, textAlign: 'center',
          }}>
            {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          width: 340, background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)', zIndex: 9999,
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple-d)' }}>
              Notificações {totalNaoLidas > 0 && <span style={{ color: 'var(--red)', fontSize: 11 }}>({totalNaoLidas})</span>}
            </span>
            {naoLidasBanco > 0 && (
              <button onClick={marcarTodasLidas}
                style={{ fontSize: 11, color: 'var(--purple)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Marcar lidas
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {todasNotifs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-s)', fontSize: 13 }}>
                Nenhuma notificação
              </div>
            ) : (
              <>
                {notifAtraso.length > 0 && (
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Em atraso
                  </div>
                )}
                {notifAtraso.map(n => (
                  <NotifItem key={n.id} n={n} cor={iconeCor} />
                ))}

                {notifProximas.length > 0 && (
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Vence em breve
                  </div>
                )}
                {notifProximas.map(n => (
                  <NotifItem key={n.id} n={n} cor={iconeCor} />
                ))}

                {notifsBanco.length > 0 && (
                  <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Sistema
                  </div>
                )}
                {notifsBanco.map(n => (
                  <NotifItem key={n.id} n={n} cor={iconeCor} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotifItem({ n, cor }) {
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      background: n.lida ? 'transparent' : 'var(--bg4)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
          background: cor[n.tipo] ?? 'var(--purple)',
        }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{n.titulo}</div>
          <div style={{ fontSize: 11, color: 'var(--text-s)', marginTop: 2 }}>{n.mensagem}</div>
        </div>
      </div>
    </div>
  )
}
