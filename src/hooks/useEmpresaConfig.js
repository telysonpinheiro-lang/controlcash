import { useState, useEffect } from 'react'

const LOGO_KEY    = 'vc_logo'
const EMPRESA_KEY = 'vc_empresa'

export default function useEmpresaConfig() {
  const [logo, setLogo] = useState(() => localStorage.getItem(LOGO_KEY))
  const [nome, setNome] = useState(() => {
    try { return JSON.parse(localStorage.getItem(EMPRESA_KEY))?.nome ?? 'CONTROLCASH' } catch { return 'CONTROLCASH' }
  })

  useEffect(() => {
    const handler = () => {
      setLogo(localStorage.getItem(LOGO_KEY))
      try { setNome(JSON.parse(localStorage.getItem(EMPRESA_KEY))?.nome ?? 'CONTROLCASH') } catch {}
    }
    window.addEventListener('vc-empresa-updated', handler)
    return () => window.removeEventListener('vc-empresa-updated', handler)
  }, [])

  return { logo, nome }
}
