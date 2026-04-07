import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination, { usePagination } from '../components/Pagination'
import { contratosApi } from '../services/api'
import { empresaContratante as _empresaStatic } from '../db/contratos'

function loadEmpresaContratante() {
  try {
    const saved = JSON.parse(localStorage.getItem('vc_empresa'))
    if (saved?.nome) return {
      nome:             saved.nome,
      cnpj:             saved.cnpj ?? '',
      endereco:         saved.endereco ?? '',
      representante:    saved.representante ?? '',
      cpf_representante:saved.cpf_representante ?? '',
      foro:             saved.foro ?? 'Perdões/MG',
    }
  } catch {}
  return _empresaStatic
}

const empresaContratante = loadEmpresaContratante()

const PLACEHOLDERS = [
  ['{{cliente}}','Contratante'],['{{cpf_cliente}}','CPF/CNPJ Contratante'],['{{telefone}}','Telefone'],['{{endereco}}','Endereço Contratante'],
  ['{{empresa}}','Contratado'],['{{cnpj}}','CNPJ Contratado'],['{{endereco_empresa}}','Endereço Contratado'],
  ['{{representante}}','Representante'],['{{cpf_representante}}','CPF Representante'],
  ['{{objeto}}','Objeto/Serviço'],['{{valor}}','Valor'],['{{parcelas}}','Parcelas'],
  ['{{prazo}}','Prazo'],['{{garantia}}','Garantia'],['{{foro}}','Foro'],['{{data}}','Data'],
]

const WaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 11, height: 11 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
  </svg>
)

const TEMPLATE_KEY = 'vc_contrato_template'

const CLAUSULAS_OPCOES = [
  { id: 'sigilo',          label: 'Sigilo e Confidencialidade', texto: 'SIGILO E CONFIDENCIALIDADE: As partes comprometem-se a manter sigilo absoluto sobre dados, informações e acessos obtidos em razão deste contrato, sob pena de responsabilização civil e criminal.' },
  { id: 'direitosAutorais',label: 'Direitos Autorais',          texto: 'DIREITOS AUTORAIS: Todos os materiais, criações e entregáveis produzidos pelo CONTRATADO são de sua titularidade até a quitação integral do contrato, momento em que a cessão de direitos se consolida ao CONTRATANTE.' },
  { id: 'multaAtraso',     label: 'Multa por Atraso',           texto: 'MULTA POR ATRASO: O atraso no pagamento de qualquer parcela implicará multa moratória de 10% sobre o valor devido, acrescida de juros de 1% ao mês e correção monetária pelo índice legal aplicável.' },
  { id: 'foro',            label: 'Foro da Comarca',            texto: `FORO: Fica eleito o Foro da Comarca de ${empresaContratante?.foro ?? 'Perdões/MG'} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro.` },
]

const GERADOR_VAZIO = { nome: '', cpf: '', telefone: '', endereco: '', descricao: '', valor: '', parcelas: '1', prazo: '', garantia: '90 dias', formaPagamento: 'À vista' }

const TEMPLATE_PADRAO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{cliente}}{{cpf_cliente}}{{endereco}}.
CONTRATADO: {{empresa}}, inscrito(a) no CPF/CNPJ nº {{cnpj}}{{endereco_empresa}}{{representante}}.

Têm entre si justo e contratado o seguinte:

CLÁUSULA 1 – DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços técnicos especializados de {{objeto}}, na empresa e endereço do CONTRATANTE acima qualificado, compreendendo os itens e condições descritos na proposta comercial vinculada.
1.2. Qualquer serviço não previsto expressamente neste contrato não está incluído no preço e dependerá de autorização prévia e expressa do CONTRATANTE.

CLÁUSULA 2 – DAS OBRIGAÇÕES DO CONTRATADO
2.1. Constituem obrigações do CONTRATADO:
a) Executar os serviços com observância das normas técnicas aplicáveis, boas práticas profissionais e padrões mínimos de segurança;
b) Entregar o sistema em funcionamento regular;
c) Prestar orientações básicas de uso ao CONTRATANTE;
d) Responder exclusivamente por vícios de execução, nos limites deste contrato.
2.2. O CONTRATADO não garante continuidade de funcionamento em razão de fatores externos, tais como falhas elétricas, oscilações de energia, internet, interferência de terceiros ou eventos de força maior.

CLÁUSULA 3 – DAS OBRIGAÇÕES DO CONTRATANTE
3.1. São obrigações do CONTRATANTE:
a) Assegurar livre acesso ao local;
b) Disponibilizar condições adequadas para execução do serviço;
c) Efetuar os pagamentos rigorosamente nos prazos ajustados;
d) Não permitir intervenções de terceiros no sistema sem autorização do CONTRATADO.

CLÁUSULA 4 – DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO
4.1. O valor total do contrato é de R$ {{valor}}{{parcelas}}.

CLÁUSULA 5 – DA INADIMPLÊNCIA E CLÁUSULA PENAL
5.1. O atraso no pagamento de qualquer valor implicará, independentemente de notificação:
a) Multa moratória de 10% (dez por cento) sobre o valor devido;
b) Juros de 1% (um por cento) ao mês, pro rata die;
c) Correção monetária pelo índice legal aplicável.
5.2. Persistindo o inadimplemento por mais de 10 (dez) dias, poderá o CONTRATADO:
a) Suspender o funcionamento do sistema, sem que isso configure ilícito;
b) Reter equipamentos e configurações, até a quitação integral;
c) Considerar o contrato rescindido, com vencimento antecipado do saldo.

CLÁUSULA 6 – DO PRAZO E MULTA POR ATRASO
6.1. O prazo máximo para execução dos serviços será de {{prazo}}.
6.2. O atraso injustificado sujeitará o CONTRATADO à multa diária de 1% (um por cento) sobre o valor do contrato, limitada a 20% (vinte por cento).

CLÁUSULA 7 – DA GARANTIA
7.1. O CONTRATADO concede garantia de {{garantia}} sobre os serviços executados.
7.2. A garantia não cobre defeitos decorrentes de mau uso, falhas elétricas, eventos externos ou intervenção de terceiros.

CLÁUSULA 8 – DA LIMITAÇÃO DE RESPONSABILIDADE
8.1. A responsabilidade do CONTRATADO limita-se exclusivamente ao valor total deste contrato.
8.2. Ficam expressamente excluídos:
a) Lucros cessantes;
b) Danos indiretos;
c) Perda de chance;
d) Danos decorrentes de falhas de segurança externa.

CLÁUSULA 9 – DA CONFIDENCIALIDADE E USO DE IMAGENS
9.1. As partes comprometem-se a manter sigilo absoluto sobre dados, imagens, acessos e informações obtidas em razão do contrato.
9.2. O CONTRATADO não se responsabiliza pelo uso ou armazenamento das imagens pelo CONTRATANTE.

CLÁUSULA 10 – DA RESCISÃO
10.1. O presente contrato poderá ser rescindido a qualquer tempo por inadimplemento, infração contratual, desistência imotivada ou por mútuo acordo entre as partes.
10.2. Em caso de rescisão por culpa ou iniciativa do CONTRATANTE, não haverá devolução de quaisquer valores já pagos, os quais serão retidos pelo CONTRATADO a título de cláusula penal compensatória, nos termos dos artigos 408, 409 e 416 do Código Civil.
10.3. Além da retenção prevista no item anterior, ocorrendo a desistência imotivada do contrato por parte do CONTRATANTE, este ficará obrigado ao pagamento de multa rescisória equivalente a 20% (vinte por cento) do valor total do contrato.
10.4. A multa prevista nesta cláusula não afasta o direito do CONTRATADO de pleitear indenização suplementar, caso comprovados prejuízos superiores, nos termos do artigo 416, parágrafo único, do Código Civil.

CLÁUSULA 11 – DO TÍTULO EXECUTIVO EXTRAJUDICIAL
11.1. O presente contrato constitui título executivo extrajudicial, nos termos do art. 784, III, do Código de Processo Civil, podendo ser executado independentemente de interpelação judicial.

CLÁUSULA 12 – DO FORO
12.1. Fica eleito o Foro da Comarca de {{foro}}, com renúncia expressa a qualquer outro.

E, por estarem justas e contratadas, firmam o presente instrumento em duas vias de igual teor.

{{foro}}, {{data}}.

CONTRATANTE: _______________________________________________________________.

CONTRATADO / REPRESENTANTE: ________________________________________________.

Testemunha 1 ________________________________________________________________.
                          CPF:

Testemunha 2 ________________________________________________________________.
                          CPF:`

function renderTemplate(template, contrato, clientesList) {
  const valor = Number(contrato.valor ?? 0).toFixed(2).replace('.', ',')
  const parcelas = contrato.parcelas > 1
    ? `, em ${contrato.parcelas} parcelas de R$ ${Number(contrato.valor_parcela ?? contrato.valorParcela ?? 0).toFixed(2).replace('.', ',')}`
    : ''
  const clienteCad = (clientesList ?? []).find(c => c.nome === contrato.cliente)
  const telefone = contrato.telefone ?? clienteCad?.telefone ?? ''
  const endereco = contrato.endereco ?? clienteCad?.endereco ?? [clienteCad?.rua, clienteCad?.bairro, clienteCad?.cidade, clienteCad?.cep].filter(Boolean).join(', ')
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return template
    .replace(/\{\{cliente\}\}/g, contrato.cliente ?? '')
    .replace(/\{\{cpf_cliente\}\}/g, contrato.cpf ? `, inscrito(a) no CPF/CNPJ nº ${contrato.cpf}` : '')
    .replace(/\{\{telefone\}\}/g, telefone ? `, Telefone: ${telefone}` : '')
    .replace(/\{\{endereco\}\}/g, endereco ? `, com endereço em ${endereco}` : '')
    .replace(/\{\{empresa\}\}/g, empresaContratante.nome)
    .replace(/\{\{cnpj\}\}/g, empresaContratante.cnpj)
    .replace(/\{\{endereco_empresa\}\}/g, empresaContratante.endereco ? `, com endereço em ${empresaContratante.endereco}` : '')
    .replace(/\{\{representante\}\}/g, empresaContratante.representante
      ? `, neste ato representada por ${empresaContratante.representante}${empresaContratante.cpf_representante ? `, CPF nº ${empresaContratante.cpf_representante}` : ''}`
      : '')
    .replace(/\{\{cpf_representante\}\}/g, empresaContratante.cpf_representante ?? '')
    .replace(/\{\{objeto\}\}/g, contrato.descricao_servico ?? contrato.descricaoServico ?? contrato.servico ?? '')
    .replace(/\{\{valor\}\}/g, valor)
    .replace(/\{\{parcelas\}\}/g, parcelas ? `${parcelas}` : '')
    .replace(/\{\{prazo\}\}/g, contrato.prazo || '___')
    .replace(/\{\{garantia\}\}/g, contrato.garantia || '___')
    .replace(/\{\{foro\}\}/g, empresaContratante.foro ?? 'Perdões/MG')
    .replace(/\{\{data\}\}/g, hoje)
}

async function gerarPDF(contrato, template, clientesList) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const margin = 20
  const pageW = 210
  const maxW = pageW - margin * 2
  let y = 20

  // Cabeçalho
  doc.setFontSize(10)
  doc.setTextColor(124, 58, 237)
  doc.setFont('helvetica', 'bold')
  doc.text(empresaContratante.nome.toUpperCase(), margin, y)
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(`CNPJ: ${empresaContratante.cnpj}`, margin, y + 5)
  doc.line(margin, y + 8, pageW - margin, y + 8)
  y += 16

  // Título
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageW / 2, y, { align: 'center' })
  y += 10

  // Corpo
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)

  const texto = renderTemplate(template, contrato, clientesList)
  const linhas = doc.splitTextToSize(texto, maxW)
  linhas.forEach(linha => {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.text(linha, margin, y)
    y += 6
  })

  // Rodapé
  y += 10
  doc.line(margin, y, pageW / 2 - 10, y)
  doc.line(pageW / 2 + 10, y, pageW - margin, y)
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text('Contratante', margin, y + 4)
  doc.text('Contratada', pageW / 2 + 10, y + 4)

  doc.save(`contrato_${(contrato.cliente ?? 'contrato').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export default function Contratos() {
  const { contratos, addContrato, updateContrato, removeContrato, clientes, servicos } = useData()
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTemplate, setModalTemplate] = useState(false)
  const [editando, setEditando] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' })
  const [template, setTemplate] = useState(() => localStorage.getItem(TEMPLATE_KEY) ?? TEMPLATE_PADRAO)
  const [templateEdit, setTemplateEdit] = useState(template)
  const [templateImagem, setTemplateImagem] = useState(null)
  const importRef = useRef()
  const textareaRef = useRef()

  // Gerador rápido
  const [gForm, setGForm] = useState(GERADOR_VAZIO)
  const gSet = (k, v) => setGForm(f => ({ ...f, [k]: v }))
  const numContrato = `${new Date().getFullYear()}/${String(contratos.length + 1).padStart(3, '0')}`

  const gFormAsContrato = {
    cliente:          gForm.nome,
    cpf:              gForm.cpf,
    telefone:         gForm.telefone,
    endereco:         gForm.endereco,
    descricao_servico:gForm.descricao,
    valor:            parseFloat(gForm.valor) || 0,
    parcelas:         parseInt(gForm.parcelas) || 1,
    valor_parcela:    (parseFloat(gForm.valor) || 0) / (parseInt(gForm.parcelas) || 1),
    prazo:            gForm.prazo,
    garantia:         gForm.garantia,
  }

  const textoGerador = renderTemplate(TEMPLATE_PADRAO, gFormAsContrato, clientes)

  async function gerarPDFGerador() {
    await gerarPDF(gFormAsContrato, TEMPLATE_PADRAO, clientes)
  }

  const pgContratos = usePagination(contratos)
  const contratoPreviewed = preview ?? contratos[0]
  const [autentiqueLoading, setAutentiqueLoading] = useState(null)

  // Auto-verifica status dos contratos pendentes na Autentique ao carregar
  const verificouRef = useRef(false)
  useEffect(() => {
    if (verificouRef.current || !contratos.length) return
    verificouRef.current = true
    contratos.forEach(async c => {
      if (c.autentique_id && c.status !== 'aceito') {
        try {
          const res = await contratosApi.statusAutentique(c.id)
          if (res.assinado) {
            updateContrato(c.id, { ...c, status: 'aceito' })
          }
        } catch {}
      }
    })
  }, [contratos])

  async function enviarParaAutentique(contrato) {
    const cl = clientes.find(x => x.nome === contrato.cliente)
    const email = cl?.email || ''
    if (!email) return showToast(`E-mail não cadastrado para ${contrato.cliente}. Cadastre em Cadastros > Clientes.`, 'danger')

    setAutentiqueLoading(contrato.id)
    try {
      const res = await contratosApi.enviarAutentique(contrato.id, email)
      showToast('Contrato enviado! Abrindo WhatsApp...', 'success')
      updateContrato(contrato.id, { ...contrato, autentique_id: res.autentique_id, autentique_link: res.autentique_link, status: 'aguardando' })

      // Abre WhatsApp automaticamente com o link da Autentique
      if (res.autentique_link) {
        const tel = cl?.telefone?.replace(/\D/g, '')
        if (tel) {
          const num = tel.length <= 11 ? '55' + tel : tel
          const msg = [
            `Olá ${contrato.cliente.split(' ')[0]}! 👋`,
            ``,
            `Segue o contrato referente ao serviço *${contrato.servico}* no valor de *R$ ${Number(contrato.valor).toFixed(2).replace('.', ',')}*.`,
            ``,
            `Assine eletronicamente pelo link abaixo:`,
            res.autentique_link,
            ``,
            `Qualquer dúvida, estou à disposição!`,
          ].join('\n')
          window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
        } else {
          navigator.clipboard.writeText(res.autentique_link).catch(() => {})
          showToast('Link copiado! Telefone não cadastrado para enviar via WhatsApp.', 'info')
        }
      }
    } catch (e) {
      showToast(e.message, 'danger')
    } finally {
      setAutentiqueLoading(null)
    }
  }

  async function verificarAssinatura(c) {
    try {
      const res = await contratosApi.statusAutentique(c.id)
      if (res.assinado) {
        showToast(`Contrato de ${c.cliente} foi ASSINADO!`, 'success')
        // Atualiza no frontend imediatamente
        updateContrato(c.id, { ...c, status: 'aceito' })
      } else {
        showToast('Aguardando assinatura do cliente...', 'info')
      }
    } catch (e) {
      showToast(e.message, 'danger')
    }
  }

  function abrirEdicao(c) {
    setEditando(c)
    setForm({ cliente: c.cliente, servico: c.servico, valor: c.valor, parcelas: String(c.parcelas), prazo: c.prazo || '', garantia: c.garantia || '' })
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!form.cliente || !form.servico) return showToast('Preencha os campos obrigatórios', 'danger')
    try {
      const payload = {
        cliente: form.cliente,
        servico: form.servico,
        descricao_servico: form.servico,
        valor: parseFloat(form.valor) || 0,
        parcelas: parseInt(form.parcelas),
        prazo: form.prazo,
        garantia: form.garantia,
      }
      if (editando) {
        const atualizado = await updateContrato(editando.id, payload)
        setPreview(atualizado ?? { ...editando, ...payload })
        showToast('Contrato atualizado!', 'success')
      } else {
        const novo = await addContrato({ ...payload, status: 'aguardando' })
        setPreview(novo)
        showToast('Contrato gerado com sucesso!', 'success')
      }
      setModalOpen(false)
      setEditando(null)
      setForm({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' })
    } catch (e) { showToast(e.message, 'danger') }
  }

  function copiarLink(c) {
    const token = c.token_aceite ?? c.id
    const link = `${window.location.origin}/aceite/${token}`
    navigator.clipboard.writeText(link)
      .then(() => showToast('Link de aceite copiado!', 'success'))
      .catch(() => showToast('Não foi possível copiar o link', 'danger'))
  }

  function imprimir() {
    const conteudo = document.getElementById('contract-print-area')?.innerHTML
    if (!conteudo) return
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>Contrato</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.7; color: #222; padding: 40px; }
      p { margin-bottom: 8px; }
      @media print {
        body { padding: 20mm; }
        @page { margin: 20mm; }
      }
    </style></head><body>${conteudo}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  function salvarTemplate() {
    setTemplate(templateEdit)
    localStorage.setItem(TEMPLATE_KEY, templateEdit)
    setModalTemplate(false)
    showToast('Template salvo!', 'success')
  }

  async function importarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    e.target.value = ''

    try {
      if (['png','jpg','jpeg','webp','gif'].includes(ext)) {
        const reader = new FileReader()
        reader.onload = ev => {
          setTemplateImagem(ev.target.result)
          showToast(`Imagem "${file.name}" carregada como referência.`, 'info')
        }
        reader.readAsDataURL(file)
        return
      }

      if (ext === 'docx') {
        const mammoth = (await import('mammoth')).default
        const buf = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buf })
        setTemplateEdit(result.value)
        showToast(`Word "${file.name}" importado com sucesso.`, 'success')
        return
      }

      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).href
        const buf = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        let texto = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          texto += content.items.map(it => it.str).join(' ') + '\n'
        }
        setTemplateEdit(texto.trim())
        showToast(`PDF "${file.name}" importado com sucesso.`, 'success')
        return
      }

      // txt / html e outros textos
      const reader = new FileReader()
      reader.onload = ev => {
        setTemplateEdit(ev.target.result)
        showToast(`Arquivo "${file.name}" carregado. Salve para aplicar.`, 'info')
      }
      reader.readAsText(file)
    } catch (err) {
      showToast(`Erro ao importar: ${err.message}`, 'danger')
    }
  }

  function inserirPlaceholder(ph) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const novo = templateEdit.slice(0, start) + ph + templateEdit.slice(end)
    setTemplateEdit(novo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + ph.length, start + ph.length)
    })
  }

  function resetarTemplate() {
    setTemplateEdit(TEMPLATE_PADRAO)
  }

  const textoPreview = contratoPreviewed ? renderTemplate(template, contratoPreviewed, clientes) : ''

  return (
    <div id="page-contratos">
      <div className="topbar">
        <div>
          <div className="topbar-title">Contratos</div>
          <div className="topbar-sub">Gere contratos a partir dos serviços</div>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-sm btn-outline" onClick={() => { setTemplateEdit(template); setModalTemplate(true) }}>📄 Template</button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>+ Novo Contrato</button>
        </div>
      </div>

      <div className="content">

        {/* ── Gerador Rápido ── */}
        <div className="gerador-grid mb-16">

          {/* Formulário */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Seção 1 */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="gerador-section-title"><span className="gerador-num">1</span> Dados do Contratante</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Nome / Razão Social</label>
                <input className="form-input" value={gForm.nome} onChange={e => gSet('nome', e.target.value)} placeholder="Nome / Razão Social" />
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">CPF / CNPJ</label>
                  <input className="form-input" value={gForm.cpf} onChange={e => gSet('cpf', e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={gForm.telefone} onChange={e => gSet('telefone', e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Endereço Completo</label>
                <input className="form-input" value={gForm.endereco} onChange={e => gSet('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" />
              </div>
            </div>

            {/* Seção 2 */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div className="gerador-section-title"><span className="gerador-num">2</span> Detalhes do Serviço</div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Descrição do Serviço</label>
                <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} value={gForm.descricao} onChange={e => gSet('descricao', e.target.value)} placeholder="Descreva o serviço a ser prestado..." />
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor Total (R$)</label>
                  <input className="form-input" type="number" value={gForm.valor} onChange={e => gSet('valor', e.target.value)} placeholder="0,00" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Parcelas</label>
                  <select className="form-input" value={gForm.parcelas} onChange={e => gSet('parcelas', e.target.value)}>
                    <option value="1">À vista</option><option value="2">2×</option><option value="3">3×</option>
                    <option value="6">6×</option><option value="12">12×</option>
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 10 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prazo de Execução</label>
                  <input className="form-input" value={gForm.prazo} onChange={e => gSet('prazo', e.target.value)} placeholder="Ex: 02 (dois) dias" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Garantia</label>
                  <input className="form-input" value={gForm.garantia} onChange={e => gSet('garantia', e.target.value)} placeholder="Ex: 90 dias" />
                </div>
              </div>
            </div>
          </div>

          {/* Prévia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="gerador-preview-wrap">
              <div className="gerador-preview-doc" id="contract-print-area">
                {textoGerador.split('\n').map((linha, i) =>
                  linha.trim() === ''
                    ? <br key={i} />
                    : /^CLÁUSULA \d+|^CONTRATANTE:|^CONTRATADO:|^Testemunha/.test(linha.trim())
                      ? <p key={i} style={{ margin: '6px 0', lineHeight: 1.7, fontSize: 12, fontWeight: 600 }}>{linha}</p>
                      : <p key={i} style={{ margin: '3px 0', lineHeight: 1.7, fontSize: 12 }}>{linha}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1, gap: 8 }} onClick={() => gerarPDFGerador().catch(e => showToast(e.message, 'danger'))}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 15, height: 15 }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Baixar PDF
              </button>
              <button className="btn btn-outline" style={{ padding: '0 14px' }} onClick={imprimir} title="Imprimir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 17, height: 17 }}>
                  <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Contrato */}
      <Modal title={editando ? 'Editar Contrato' : 'Gerar Contrato'} open={modalOpen} onClose={() => { setModalOpen(false); setEditando(null); setForm({ cliente: '', servico: '', valor: '', parcelas: '1', prazo: '', garantia: '' }) }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cliente</label>
            <select className="form-input" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serviço</label>
            <select className="form-input" value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })}>
              <option value="">Selecione...</option>
              {servicos.map(s => <option key={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input className="form-input" type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Parcelas</label>
            <select className="form-input" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })}>
              <option value="1">À vista</option><option value="2">2×</option><option value="3">3×</option>
              <option value="6">6×</option><option value="12">12×</option>
            </select>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Prazo</label>
            <input className="form-input" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} placeholder="Ex: 30 de junho de 2025" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Garantia</label>
            <input className="form-input" value={form.garantia} onChange={e => setForm({ ...form, garantia: e.target.value })} placeholder="Ex: 90 dias" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Gerar Contrato</button>
        </div>
      </Modal>

      {/* Modal Template */}
      <Modal title="Template do Contrato" open={modalTemplate} onClose={() => setModalTemplate(false)}>
        {/* Toolbar de placeholders */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {PLACEHOLDERS.map(([ph, label]) => (
            <button key={ph} onClick={() => inserirPlaceholder(ph)}
              style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--purple)' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <textarea
            ref={textareaRef}
            className="form-input"
            style={{ flex: 1, height: 280, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
            value={templateEdit}
            onChange={e => setTemplateEdit(e.target.value)}
          />
          {templateImagem && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={templateImagem} alt="Referência" style={{ width: 180, maxHeight: 280, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 6 }} />
              <button onClick={() => setTemplateImagem(null)}
                style={{ position: 'absolute', top: 4, right: 4, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: 11, lineHeight: 1 }}>
                ×
              </button>
              <div style={{ fontSize: 9, color: 'var(--text-xs)', textAlign: 'center', marginTop: 4 }}>Referência visual</div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div className="flex gap-8">
            <input ref={importRef} type="file" accept=".txt,.html,.docx,.pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={importarArquivo} />
            <button className="btn btn-outline btn-sm" onClick={() => importRef.current.click()}>📁 Importar (Word/PDF/TXT/Imagem)</button>
            <button className="btn btn-outline btn-sm" onClick={resetarTemplate}>↺ Padrão</button>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-outline btn-sm" onClick={() => setModalTemplate(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={salvarTemplate}>Salvar template</button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
