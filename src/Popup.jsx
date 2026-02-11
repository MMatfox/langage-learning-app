import { useApp } from './AppContext'

export default function Popup() {
  const { popup } = useApp()

  if (!popup.isOpen) return null

  const styles = {
    info: {
      bg: 'bg-blue-600',
      icon: 'ℹ️',
      border: 'border-blue-400'
    },
    success: {
      bg: 'bg-green-500',
      icon: '✅',
      border: 'border-green-400'
    },
    error: {
      bg: 'bg-red-500',
      icon: '⚠️',
      border: 'border-red-400'
    }
  }

  const currentStyle = styles[popup.type] || styles.info

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none">
      <div className={`
        ${currentStyle.bg} 
        text-white px-6 py-4 rounded-2xl shadow-2xl 
        flex items-center gap-4 
        animate-slide-down border-2 ${currentStyle.border}
        backdrop-blur-md bg-opacity-95
      `}>
        <span className="text-2xl">{currentStyle.icon}</span>
        <p className="font-bold text-sm tracking-wide shadow-black drop-shadow-md">
          {popup.message}
        </p>
      </div>
    </div>
  )
}
