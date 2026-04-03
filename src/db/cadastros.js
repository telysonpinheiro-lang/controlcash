// Banco de dados de cadastros (clientes, fornecedores e serviços)
// Em produção, substituir por chamadas à API REST /cadastros

export const clientes = [
  {
    id: 1,
    nome: 'Carlos Alves',
    initials: 'CA',
    telefone: '(35) 99999-0001',
    email: 'carlos@email.com',
    endereco: 'Rua das Flores, 123',
    totalServicos: 2,
  },
  {
    id: 2,
    nome: 'Ana Lima',
    initials: 'AL',
    telefone: '(35) 99999-0002',
    email: 'ana@empresa.com',
    endereco: 'Av. Central, 500',
    totalServicos: 1,
  },
  {
    id: 3,
    nome: 'Maria Santos',
    initials: 'MS',
    telefone: '(35) 99999-0003',
    email: 'maria@email.com',
    endereco: 'Rua XV de Nov., 88',
    totalServicos: 3,
  },
  {
    id: 4,
    nome: 'Pedro Ferreira',
    initials: 'PF',
    telefone: '(35) 99999-0004',
    email: 'pedro@email.com',
    endereco: 'Rua das Acácias, 45',
    totalServicos: 1,
  },
]

export const fornecedores = [
  {
    id: 1,
    nome: 'Elétrica Peças',
    telefone: '(35) 3333-0001',
    categoria: 'Elétrica / CFTV',
  },
  {
    id: 2,
    nome: 'InfoPeças Ltda',
    telefone: '(35) 3333-0002',
    categoria: 'Hardware',
  },
  {
    id: 3,
    nome: 'TeleRede',
    telefone: '(35) 3333-0003',
    categoria: 'Redes / Cabeamento',
  },
]

export const servicos = [
  {
    id: 1,
    nome: 'Instalação CFTV (4 câmeras)',
    valorPadrao: 950.00,
    custoMin: 380.00,
    margem: 60,
  },
  {
    id: 2,
    nome: 'Manutenção de PC / Notebook',
    valorPadrao: 180.00,
    custoMin: 40.00,
    margem: 78,
  },
  {
    id: 3,
    nome: 'Infra de Rede Wi-Fi',
    valorPadrao: 1200.00,
    custoMin: 450.00,
    margem: 63,
  },
  {
    id: 4,
    nome: 'Site Institucional',
    valorPadrao: 2800.00,
    custoMin: 0,
    margem: 100,
  },
  {
    id: 5,
    nome: 'SEO Google (mensal)',
    valorPadrao: 700.00,
    custoMin: 0,
    margem: 100,
  },
]
