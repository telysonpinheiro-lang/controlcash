// Banco de dados de contratos gerados
// Em produção, substituir por chamadas à API REST /contratos

export const contratos = [
  {
    id: 1,
    cliente: 'Carlos Alves',
    cpf: '000.000.000-00',
    endereco: 'Rua das Flores, 123 — Perdões/MG',
    servico: 'CFTV',
    descricaoServico: 'Instalação e configuração de sistema de câmeras de segurança CFTV com 4 câmeras HD, DVR e acesso remoto.',
    valor: 950.00,
    parcelas: 3,
    valorParcela: 316.67,
    prazo: '20 de junho de 2025',
    garantia: '90 dias para defeitos de instalação e 12 meses para equipamentos.',
    status: 'aguardando',
  },
  {
    id: 2,
    cliente: 'Ana Lima',
    cpf: '111.111.111-11',
    endereco: 'Av. Central, 500 — Perdões/MG',
    servico: 'Site institucional',
    descricaoServico: 'Desenvolvimento de site institucional responsivo com até 5 páginas, SEO básico e hospedagem por 12 meses.',
    valor: 2800.00,
    parcelas: 6,
    valorParcela: 466.67,
    prazo: '30 de julho de 2025',
    garantia: '60 dias para ajustes e revisões.',
    status: 'aceito',
  },
  {
    id: 3,
    cliente: 'Maria Santos',
    cpf: '222.222.222-22',
    endereco: 'Rua XV de Nov., 88 — Perdões/MG',
    servico: 'Manutenção rede',
    descricaoServico: 'Manutenção preventiva e corretiva da infraestrutura de rede local, incluindo substituição de cabos e configuração de switch.',
    valor: 600.00,
    parcelas: 1,
    valorParcela: 600.00,
    prazo: '14 de junho de 2025',
    garantia: '30 dias para os serviços executados.',
    status: 'aceito',
  },
]

export const empresaContratante = {
  nome: 'ControlCash Tecnologia',
  cnpj: '00.000.000/0001-00',
}
