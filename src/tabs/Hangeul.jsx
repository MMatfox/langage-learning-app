import { useState } from 'react'
import { useApp } from '../AppContext'

const HANGEUL_DATA = {
  consonants: [
    { char: 'ㄱ', sound: 'g/k' }, { char: 'ㄴ', sound: 'n' }, { char: 'ㄷ', sound: 'd' },
    { char: 'ㄹ', sound: 'r/l' }, { char: 'ㅁ', sound: 'm' }, { char: 'ㅂ', sound: 'b' },
    { char: 'ㅅ', sound: 's' }, { char: 'ㅇ', sound: 'ng' }, { char: 'ㅈ', sound: 'j' },
    { char: 'ㅊ', sound: 'ch' }, { char: 'ㅋ', sound: 'k' }, { char: 'ㅌ', sound: 't' },
    { char: 'ㅍ', sound: 'p' }, { char: 'ㅎ', sound: 'h' }
  ],
  vowels: [
    { char: 'ㅏ', sound: 'a' }, { char: 'ㅑ', sound: 'ya' }, { char: 'ㅓ', sound: 'eo' },
    { char: 'ㅕ', sound: 'yeo' }, { char: 'ㅗ', sound: 'o' }, { char: 'ㅛ', sound: 'yo' },
    { char: 'ㅜ', sound: 'u' }, { char: 'ㅠ', sound: 'yu' }, { char: 'ㅡ', sound: 'eu' },
    { char: 'ㅣ', sound: 'i' }
  ],
  doubles: [
    { char: 'ㄲ', sound: 'kk' }, { char: 'ㄸ', sound: 'tt' }, { char: 'ㅃ', sound: 'pp' },
    { char: 'ㅆ', sound: 'ss' }, { char: 'ㅉ', sound: 'jj' }
  ]
}

function HangeulSection({ title, data, selected, onSelect }) {
  return (
    <div className="mb-8">
      <h3 className="text-left text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{title}</h3>
      <div className="grid grid-cols-4 gap-3">
        {data.map((item) => (
          <button
            key={item.char}
            onClick={() => onSelect(item.char)}
            className={`aspect-square flex flex-col items-center justify-center rounded-2xl transition-all ${
              selected === item.char ? 'bg-blue-600 text-white shadow-lg scale-95' : 'bg-white text-slate-800 shadow-sm border border-slate-100'
            }`}
          >
            <span className="text-2xl font-bold">{item.char}</span>
            <span className={`text-[10px] font-bold ${selected === item.char ? 'text-blue-100' : 'text-slate-400'}`}>{item.sound}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Hangeul() {
  const { t } = useApp()
  const [selected, setSelected] = useState(null)

  const playSound = (char) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(char)
    utterance.lang = 'ko-KR'
    
    const voices = window.speechSynthesis.getVoices()
    const koVoice = voices.find(v => v.lang.startsWith('ko'))
    if (koVoice) utterance.voice = koVoice
    
    window.speechSynthesis.speak(utterance)
    setSelected(char)
  }

  const getSelectedSound = () => {
    const all = [...HANGEUL_DATA.consonants, ...HANGEUL_DATA.vowels, ...HANGEUL_DATA.doubles]
    return all.find(item => item.char === selected)?.sound || ""
  }

  return (
    <div className="p-6 pb-32 max-w-md mx-auto">
      <header className="text-center mb-8 pt-8">
        <h2 className="text-3xl font-black text-slate-800">{t('hangeul.title')}</h2>
        <p className="text-slate-400 text-sm">{t('hangeul.tap_to_listen')}</p>
      </header>
      <HangeulSection title={t('hangeul.consonants')} data={HANGEUL_DATA.consonants} selected={selected} onSelect={playSound} />
      <HangeulSection title={t('hangeul.vowels')} data={HANGEUL_DATA.vowels} selected={selected} onSelect={playSound} />
      <HangeulSection title={t('hangeul.double_consonants')} data={HANGEUL_DATA.doubles} selected={selected} onSelect={playSound} />
      {selected && (
        <div className="fixed bottom-24 left-6 right-6 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center animate-bounce-in">
          <div>
            <span className="text-xs opacity-80 font-bold uppercase">{t('hangeul.sound')}</span>
            <p className="font-bold text-lg leading-tight uppercase">"{getSelectedSound()}"</p>
          </div>
          <span className="text-4xl font-black">{selected}</span>
        </div>
      )}
    </div>
  )
}