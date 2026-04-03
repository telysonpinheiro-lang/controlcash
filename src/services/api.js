// Camada de serviços — todas as chamadas à API PHP ficam aqui.
// Autenticação via JWT (Authorization: Bearer <token>).

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost/virtualcore-react/backend/api'

const TOKEN_KEY = 'vc_token'

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function authHeaders() {
  const headers = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Fallback: envia X-User-Id para compatibilidade durante migração
  try {
    const user = JSON.parse(localStorage.getItem('vc_user'))
    if (user?.id) {
      headers['X-User-Id'] = String(user.id)
      headers['X-User-Role'] = user.role ?? 'user'
    }
  } catch {}
  return headers
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
    ...options,
  })
  const json = await res.json()
  // Se token expirou, limpa sessão
  if (res.status === 401 && getToken()) {
    setToken(null)
    localStorage.removeItem('vc_user')
    window.location.reload()
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json
}

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (usuario, senha) =>
    request('/auth/login.php', { method: 'POST', body: JSON.stringify({ usuario, senha }) }),
}

// ── Vendas ────────────────────────────────────────────────
export const vendasApi = {
  list:   ()           => request('/vendas/index.php'),
  create: (data)       => request('/vendas/index.php', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)   => request(`/vendas/index.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)         => request(`/vendas/index.php?id=${id}`, { method: 'DELETE' }),
}

// ── Contas a Pagar ────────────────────────────────────────
export const pagarApi = {
  list:      ()        => request('/contas-pagar/index.php'),
  create:    (d)       => request('/contas-pagar/index.php', { method: 'POST', body: JSON.stringify(d) }),
  update:    (id, d)   => request(`/contas-pagar/index.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  marcarPago:(id)      => request(`/contas-pagar/index.php?id=${id}`, { method: 'PUT' }),
  remove:    (id)      => request(`/contas-pagar/index.php?id=${id}`, { method: 'DELETE' }),
}

// ── Contas a Receber ──────────────────────────────────────
export const receberApi = {
  list:      ()        => request('/contas-receber/index.php'),
  create:    (d)       => request('/contas-receber/index.php', { method: 'POST', body: JSON.stringify(d) }),
  update:    (id, d)   => request(`/contas-receber/index.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  confirmar: (id)      => request(`/contas-receber/index.php?id=${id}`, { method: 'PUT' }),
  remove:    (id)      => request(`/contas-receber/index.php?id=${id}`, { method: 'DELETE' }),
}

// ── Contratos ─────────────────────────────────────────────
export const contratosApi = {
  list:   ()           => request('/contratos/index.php'),
  create: (data)       => request('/contratos/index.php', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)   => request(`/contratos/index.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)         => request(`/contratos/index.php?id=${id}`, { method: 'DELETE' }),
}

// ── Cadastros ─────────────────────────────────────────────
export const clientesApi = {
  list:   ()           => request('/cadastros/clientes.php'),
  create: (data)       => request('/cadastros/clientes.php', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)   => request(`/cadastros/clientes.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)         => request(`/cadastros/clientes.php?id=${id}`, { method: 'DELETE' }),
}

export const fornecedoresApi = {
  list:   ()           => request('/cadastros/fornecedores.php'),
  create: (data)       => request('/cadastros/fornecedores.php', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)   => request(`/cadastros/fornecedores.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)         => request(`/cadastros/fornecedores.php?id=${id}`, { method: 'DELETE' }),
}

export const servicosApi = {
  list:   ()           => request('/cadastros/servicos.php'),
  create: (data)       => request('/cadastros/servicos.php', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data)   => request(`/cadastros/servicos.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id)         => request(`/cadastros/servicos.php?id=${id}`, { method: 'DELETE' }),
}

// ── Admin ─────────────────────────────────────────────────
export const adminApi = {
  list:         ()           => request('/admin/clientes.php'),
  create:       (data)       => request('/admin/clientes.php', { method: 'POST', body: JSON.stringify(data) }),
  update:       (id, data)   => request(`/admin/clientes.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove:       (id)         => request(`/admin/clientes.php?id=${id}`, { method: 'DELETE' }),
  toggleStatus: (id, data)   => request(`/admin/toggle_status.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

export const cobrancasApi = {
  list:     ()         => request('/admin/cobrancas.php'),
  gerarMes: (mesRef)   => request('/admin/cobrancas.php', { method: 'POST', body: JSON.stringify({ acao: 'gerar_mes', mes_ref: mesRef }) }),
  update:   (id, data) => request(`/admin/cobrancas.php?id=${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  pagar:    (id)       => request(`/admin/cobrancas.php?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pago' }) }),
  estornar: (id)       => request(`/admin/cobrancas.php?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'pendente' }) }),
  remove:   (id)       => request(`/admin/cobrancas.php?id=${id}`, { method: 'DELETE' }),
}

// ── Notificações ──────────────────────────────────────────
export const notificacoesApi = {
  list:             (headers) => request('/notificacoes/index.php', { headers }),
  marcarLida:       (id, headers) => request(`/notificacoes/index.php?id=${id}`, { method: 'PUT', headers }),
  marcarTodasLidas: (headers) => request('/notificacoes/index.php?all=1', { method: 'PUT', headers }),
}

// ── WhatsApp ──────────────────────────────────────────────
export const whatsappApi = {
  enviar: (telefone, mensagem, headers) =>
    request('/whatsapp/enviar.php', {
      method: 'POST',
      headers,
      body: JSON.stringify({ telefone, mensagem }),
    }),
}

// ── Estoque ───────────────────────────────────────────────
export const estoqueApi = {
  list:   (headers)              => request('/estoque/index.php', { headers }),
  criar:  (data, headers)        => request('/estoque/index.php', { method: 'POST', headers, body: JSON.stringify({ acao: 'criar', ...data }) }),
  update: (id, data, headers)    => request(`/estoque/index.php?id=${id}`, { method: 'PATCH', headers, body: JSON.stringify(data) }),
  entrada:(id, data, headers)    => request(`/estoque/index.php?id=${id}`, { method: 'POST', headers, body: JSON.stringify({ acao: 'entrada', ...data }) }),
  saida:  (id, data, headers)    => request(`/estoque/index.php?id=${id}`, { method: 'POST', headers, body: JSON.stringify({ acao: 'saida', ...data }) }),
  remove: (id, headers)          => request(`/estoque/index.php?id=${id}`, { method: 'DELETE', headers }),
}

// ── Relatórios ────────────────────────────────────────────
export const relatoriosApi = {
  inadimplencia: (headers) => request('/relatorios/inadimplencia.php', { headers }),
}
