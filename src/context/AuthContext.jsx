import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authApi } from '../services/api'
import { setToken } from '../services/api'

const AuthContext = createContext(null)

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000 // 8 horas sem atividade
const ACTIVITY_KEY = 'vc_last_activity'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('vc_user'))
      if (!user) return null
      const lastActivity = localStorage.getItem(ACTIVITY_KEY)
      if (lastActivity && Date.now() - Number(lastActivity) > INACTIVITY_TIMEOUT) {
        localStorage.removeItem('vc_user')
        localStorage.removeItem('vc_login_time')
        localStorage.removeItem(ACTIVITY_KEY)
        setToken(null)
        return null
      }
      return user
    } catch { return null }
  })

  const inactivityTimer = useRef(null)

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('vc_user')
    localStorage.removeItem('vc_login_time')
    localStorage.removeItem(ACTIVITY_KEY)
    setToken(null)
  }, [])

  const resetInactivityTimer = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(logout, INACTIVITY_TIMEOUT)
  }, [logout])

  useEffect(() => {
    if (!currentUser) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      return
    }

    const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now()
    const elapsed = Date.now() - lastActivity
    if (elapsed >= INACTIVITY_TIMEOUT) { logout(); return }

    inactivityTimer.current = setTimeout(logout, INACTIVITY_TIMEOUT - elapsed)

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']
    let throttle = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - throttle < 30000) return
      throttle = now
      resetInactivityTimer()
    }

    events.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }))

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      events.forEach(evt => window.removeEventListener(evt, onActivity))
    }
  }, [currentUser, logout, resetInactivityTimer])

  async function login(usuario, senha) {
    try {
      const data = await authApi.login(usuario, senha)
      // Salva JWT token de forma segura
      if (data.token) {
        setToken(data.token)
      }
      // Não salvar senha ou dados sensíveis — apenas info de exibição
      const safeUser = {
        id: data.user.id,
        nome: data.user.nome,
        email: data.user.email,
        role: data.user.role,
        plano: data.user.plano,
      }
      setCurrentUser(safeUser)
      localStorage.setItem('vc_user', JSON.stringify(safeUser))
      localStorage.setItem('vc_login_time', String(Date.now()))
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()))
      return { ok: true, name: data.user.nome }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
