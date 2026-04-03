import { useToast } from '../context/ToastContext'

export default function Toast() {
  const { toast } = useToast()

  return (
    <div className={`toast ${toast.visible ? 'show' : ''} ${toast.type}`}>
      {toast.msg}
    </div>
  )
}
