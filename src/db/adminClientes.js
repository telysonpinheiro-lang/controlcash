// Banco de dados de clientes do sistema (painel admin SaaS)
// Em produção, substituir por chamadas à API REST /admin/clientes

export const adminClientes = [
  {
    id: 1,
    empresa: 'Eletro Silva',
    contato: 'João Silva',
    plano: 'profissional',
    setup: 147,
    recorrencia: 79,
    modulos: ['Dashboard', 'Vendas', 'Financeiro', 'Contratos'],
    status: 'ativo',
  },
  {
    id: 2,
    empresa: 'NetFix TI',
    contato: 'Carlos Mota',
    plano: 'empresa',
    setup: 247,
    recorrencia: 129,
    modulos: ['Todos'],
    status: 'ativo',
  },
  {
    id: 3,
    empresa: 'PC Rápido',
    contato: 'Ana Rocha',
    plano: 'essencial',
    setup: 97,
    recorrencia: 49,
    modulos: ['Dashboard', 'Vendas', 'Cadastros'],
    status: 'ativo',
  },
]

export const planos = {
  essencial:    { label: 'Essencial',    preco: 49  },
  profissional: { label: 'Profissional', preco: 79  },
  business:     { label: 'Business',     preco: 129 },
  admin:        { label: 'Admin',        preco: 0   },
}
