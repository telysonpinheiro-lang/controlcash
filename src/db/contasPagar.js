// Banco de dados de contas a pagar
// Em produção, substituir por chamadas à API REST /financeiro/pagar

export const contasPagar = [
  {
    id: 1,
    fornecedor: 'Elétrica Peças',
    descricao: 'Materiais câmeras — Carlos',
    valor: 850.00,
    vencimento: '19/06/2025',
    status: 'pendente',
  },
  {
    id: 2,
    fornecedor: 'InfoPeças Ltda',
    descricao: 'Componentes notebook',
    valor: 320.00,
    vencimento: '25/06/2025',
    status: 'pendente',
  },
  {
    id: 3,
    fornecedor: 'TeleRede',
    descricao: 'Cabo UTP Cat6',
    valor: 1130.00,
    vencimento: '30/06/2025',
    status: 'pendente',
  },
  {
    id: 4,
    fornecedor: 'Elétrica Peças',
    descricao: 'Materiais rede — Restaurante',
    valor: 680.00,
    vencimento: '10/06/2025',
    status: 'pago',
  },
]
