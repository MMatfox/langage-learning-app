import { useState } from 'react'
import { useApp } from '../AppContext'

const JAP_DATA = {
  hiragana: [
    { char: 'あ', rom: 'a' }, { char: 'い', rom: 'i' }, { char: 'う', rom: 'u' }, { char: 'え', rom: 'e' }, { char: 'お', rom: 'o' },
    { char: 'か', rom: 'ka' }, { char: 'き', rom: 'ki' }, { char: 'く', rom: 'ku' }, { char: 'け', rom: 'ke' }, { char: 'こ', rom: 'ko' },
    { char: 'さ', rom: 'sa' }, { char: 'し', rom: 'shi' }, { char: 'す', rom: 'su' }, { char: 'せ', rom: 'se' }, { char: 'そ', rom: 'so' },
    { char: 'た', rom: 'ta' }, { char: 'ち', rom: 'chi' }, { char: 'つ', rom: 'tsu' }, { char: 'て', rom: 'te' }, { char: 'と', rom: 'to' },
    { char: 'な', rom: 'na' }, { char: 'に', rom: 'ni' }, { char: 'ぬ', rom: 'nu' }, { char: 'ね', rom: 'ne' }, { char: 'の', rom: 'no' },
    { char: 'は', rom: 'ha' }, { char: 'ひ', rom: 'hi' }, { char: 'ふ', rom: 'fu' }, { char: 'へ', rom: 'he' }, { char: 'ほ', rom: 'ho' },
    { char: 'ま', rom: 'ma' }, { char: 'み', rom: 'mi' }, { char: 'む', rom: 'mu' }, { char: 'め', rom: 'me' }, { char: 'も', rom: 'mo' },
    { char: 'や', rom: 'ya' }, { char: 'ゆ', rom: 'yu' }, { char: 'よ', rom: 'yo' },
    { char: 'ら', rom: 'ra' }, { char: 'り', rom: 'ri' }, { char: 'る', rom: 'ru' }, { char: 'れ', rom: 're' }, { char: 'ろ', rom: 'ro' },
    { char: 'わ', rom: 'wa' }, { char: 'を', rom: 'wo' }, { char: 'ん', rom: 'n' }
  ],
  katakana: [
    { char: 'ア', rom: 'a' }, { char: 'イ', rom: 'i' }, { char: 'ウ', rom: 'u' }, { char: 'エ', rom: 'e' }, { char: 'オ', rom: 'o' },
    { char: 'カ', rom: 'ka' }, { char: 'キ', rom: 'ki' }, { char: 'ク', rom: 'ku' }, { char: 'ケ', rom: 'ke' }, { char: 'コ', rom: 'ko' },
    { char: 'サ', rom: 'sa' }, { char: 'シ', rom: 'shi' }, { char: 'ス', rom: 'su' }, { char: 'セ', rom: 'se' }, { char: 'ソ', rom: 'so' },
    { char: 'タ', rom: 'ta' }, { char: 'チ', rom: 'chi' }, { char: 'ツ', rom: 'tsu' }, { char: 'テ', rom: 'te' }, { char: 'ト', rom: 'to' },
    { char: 'ナ', rom: 'na' }, { char: 'ニ', rom: 'ni' }, { char: 'ヌ', rom: 'nu' }, { char: 'ネ', rom: 'ne' }, { char: 'ノ', rom: 'no' },
    { char: 'ハ', rom: 'ha' }, { char: 'ヒ', rom: 'hi' }, { char: 'フ', rom: 'fu' }, { char: 'ヘ', rom: 'he' }, { char: 'ホ', rom: 'ho' },
    { char: 'マ', rom: 'ma' }, { char: 'ミ', rom: 'mi' }, { char: 'ム', rom: 'mu' }, { char: 'メ', rom: 'me' }, { char: 'モ', rom: 'mo' },
    { char: 'ヤ', rom: 'ya' }, { char: 'ユ', rom: 'yu' }, { char: 'ヨ', rom: 'yo' },
    { char: 'ラ', rom: 'ra' }, { char: 'リ', rom: 'ri' }, { char: 'ル', rom: 'ru' }, { char: 'レ', rom: 're' }, { char: 'ロ', rom: 'ro' },
    { char: 'ワ', rom: 'wa' }, { char: 'ヲ', rom: 'wo' }, { char: 'ン', rom: 'n' }
  ],
  kanji: [
    // Nombres & Compteurs
    { char: '一', rom: 'ichi', meaning: 'Un' }, { char: '二', rom: 'ni', meaning: 'Deux' }, { char: '三', rom: 'san', meaning: 'Trois' },
    { char: '四', rom: 'yon', meaning: 'Quatre' }, { char: '五', rom: 'go', meaning: 'Cinq' }, { char: '六', rom: 'roku', meaning: 'Six' },
    { char: '七', rom: 'nana', meaning: 'Sept' }, { char: '八', rom: 'hachi', meaning: 'Huit' }, { char: '九', rom: 'kyu', meaning: 'Neuf' },
    { char: '十', rom: 'ju', meaning: 'Dix' }, { char: '百', rom: 'hyaku', meaning: 'Cent' }, { char: '千', rom: 'sen', meaning: 'Mille' },
    { char: '万', rom: 'man', meaning: 'Dix mille' }, { char: '円', rom: 'en', meaning: 'Yen / Cercle' },
    
    // Temps & Calendrier
    { char: '日', rom: 'nichi', meaning: 'Jour / Soleil' }, { char: '月', rom: 'getsu', meaning: 'Mois / Lune' }, { char: '火', rom: 'ka', meaning: 'Feu (Mardi)' },
    { char: '水', rom: 'sui', meaning: 'Eau (Mercredi)' }, { char: '木', rom: 'moku', meaning: 'Arbre (Jeudi)' }, { char: '金', rom: 'kin', meaning: 'Or (Vendredi)' },
    { char: '土', rom: 'do', meaning: 'Terre (Samedi)' }, { char: '年', rom: 'nen', meaning: 'Année' }, { char: '時', rom: 'ji', meaning: 'Heure' },
    { char: '分', rom: 'fun', meaning: 'Minute' }, { char: '午', rom: 'go', meaning: 'Midi' }, { char: '今', rom: 'ima', meaning: 'Maintenant' },
    { char: '先', rom: 'sen', meaning: 'Précédent' }, { char: '来', rom: 'rai', meaning: 'Venir / Prochain' }, { char: '週', rom: 'shu', meaning: 'Semaine' },
    
    // Nature & Éléments
    { char: '山', rom: 'yama', meaning: 'Montagne' }, { char: '川', rom: 'kawa', meaning: 'Rivière' }, { char: '田', rom: 'ta', meaning: 'Rizière' },
    { char: '石', rom: 'ishi', meaning: 'Pierre' }, { char: '花', rom: 'hana', meaning: 'Fleur' }, { char: '草', rom: 'kusa', meaning: 'Herbe' },
    { char: '雨', rom: 'ame', meaning: 'Pluie' }, { char: '雪', rom: 'yuki', meaning: 'Neige' }, { char: '空', rom: 'sora', meaning: 'Ciel' },
    { char: '天', rom: 'ten', meaning: 'Paradis / Ciel' }, { char: '気', rom: 'ki', meaning: 'Esprit / Air' }, { char: '海', rom: 'umi', meaning: 'Mer' },

    // Personnes & Corps
    { char: '人', rom: 'jin', meaning: 'Personne' }, { char: '子', rom: 'ko', meaning: 'Enfant' }, { char: '男', rom: 'otoko', meaning: 'Homme' },
    { char: '女', rom: 'onna', meaning: 'Femme' }, { char: '父', rom: 'chichi', meaning: 'Père' }, { char: '母', rom: 'haha', meaning: 'Mère' },
    { char: '友', rom: 'tomo', meaning: 'Ami' }, { char: '手', rom: 'te', meaning: 'Main' }, { char: '足', rom: 'ashi', meaning: 'Pied / Jambe' },
    { char: '目', rom: 'me', meaning: 'Oeil' }, { char: '口', rom: 'kuchi', meaning: 'Bouche' }, { char: '耳', rom: 'mimi', meaning: 'Oreille' },

    // Directions & Lieux
    { char: '上', rom: 'ue', meaning: 'Haut / Dessus' }, { char: '下', rom: 'shita', meaning: 'Bas / Dessous' }, { char: '中', rom: 'naka', meaning: 'Milieu / Dedans' },
    { char: '外', rom: 'soto', meaning: 'Dehors' }, { char: '右', rom: 'migi', meaning: 'Droite' }, { char: '左', rom: 'hidari', meaning: 'Gauche' },
    { char: '北', rom: 'kita', meaning: 'Nord' }, { char: '南', rom: 'minami', meaning: 'Sud' }, { char: '東', rom: 'higashi', meaning: 'Est' },
    { char: '西', rom: 'nishi', meaning: 'Ouest' }, { char: '国', rom: 'kuni', meaning: 'Pays' }, { char: '道', rom: 'michi', meaning: 'Chemin' },

    // Actions (Verbes)
    { char: '行', rom: 'i(ku)', meaning: 'Aller' }, { char: '来', rom: 'ku(ru)', meaning: 'Venir' }, { char: '帰', rom: 'kae(ru)', meaning: 'Rentrer' },
    { char: '食', rom: 'ta(beru)', meaning: 'Manger' }, { char: '飲', rom: 'no(mu)', meaning: 'Boire' }, { char: '見', rom: 'mi(ru)', meaning: 'Voir' },
    { char: '聞', rom: 'ki(ku)', meaning: 'Entendre' }, { char: '読', rom: 'yo(mu)', meaning: 'Lire' }, { char: '書', rom: 'ka(ku)', meaning: 'Écrire' },
    { char: '話', rom: 'hana(su)', meaning: 'Parler' }, { char: '買', rom: 'ka(u)', meaning: 'Acheter' }, { char: '立', rom: 'ta(tsu)', meaning: 'Se lever' },
    { char: '出', rom: 'de(ru)', meaning: 'Sortir' }, { char: '入', rom: 'hai(ru)', meaning: 'Entrer' }, { char: '会', rom: 'a(u)', meaning: 'Rencontrer' },
    { char: '休', rom: 'yasu(mu)', meaning: 'Se reposer' },

    // Adjectifs & Couleurs
    { char: '大', rom: 'dai', meaning: 'Grand' }, { char: '小', rom: 'sho', meaning: 'Petit' }, { char: '高', rom: 'taka', meaning: 'Haut / Cher' },
    { char: '安', rom: 'yasu', meaning: 'Pas cher' }, { char: '新', rom: 'shin', meaning: 'Nouveau' }, { char: '古', rom: 'furu', meaning: 'Vieux' },
    { char: '多', rom: 'o(oi)', meaning: 'Beaucoup' }, { char: '少', rom: 'suku(nai)', meaning: 'Peu' }, { char: '長', rom: 'naga', meaning: 'Long' },
    { char: '白', rom: 'shiro', meaning: 'Blanc' }, { char: '黒', rom: 'kuro', meaning: 'Noir' }, { char: '赤', rom: 'aka', meaning: 'Rouge' },
    { char: '青', rom: 'ao', meaning: 'Bleu' },

    // École & Divers
    { char: '学', rom: 'gaku', meaning: 'Étude' }, { char: '校', rom: 'kou', meaning: 'École' }, { char: '先', rom: 'sen', meaning: 'Précédent / Prof' },
    { char: '生', rom: 'sei', meaning: 'Vie / Élève' }, { char: '名', rom: 'na', meaning: 'Nom' }, { char: '車', rom: 'kuruma', meaning: 'Voiture' },
    { char: '電', rom: 'den', meaning: 'Électricité' }, { char: '駅', rom: 'eki', meaning: 'Gare' }, { char: '社', rom: 'sha', meaning: 'Société / Sanctuaire' }
  ]
}

function Section({ title, data, selected, onSelect, showMeaning = false }) {
  return (
    <div className="mb-8 animate-fade-in">
      <h3 className="text-left text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 px-2">{title}</h3>
      <div className={`grid ${showMeaning ? 'grid-cols-3' : 'grid-cols-5'} gap-2 sm:gap-3`}>
        {data.map((item) => (
          <button
            key={item.char}
            onClick={() => onSelect(item)}
            className={`relative flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border ${
              selected === item.char 
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg scale-95 border-transparent' 
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
            } ${showMeaning ? 'aspect-[4/3] p-2' : 'aspect-square'}`}
          >
            <span className={`${showMeaning ? 'text-2xl' : 'text-xl'} font-black mb-0.5`}>{item.char}</span>
            <span className={`text-[10px] font-bold uppercase tracking-tight ${selected === item.char ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
              {item.rom}
            </span>
            {showMeaning && item.meaning && (
              <span className={`text-[9px] mt-1 font-medium truncate w-full px-1 ${selected === item.char ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.meaning}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function JapaneseAlphabet() {
  const { t } = useApp()
  const [selected, setSelected] = useState(null)
  const [currentTab, setCurrentTab] = useState('hiragana') // 'hiragana', 'katakana', 'kanji'

  const playSound = (item) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(item.char)
    utterance.lang = 'ja-JP'
    utterance.rate = 0.8
    
    const voices = window.speechSynthesis.getVoices()
    const jpVoice = voices.find(v => v.lang === 'ja-JP') || voices.find(v => v.lang.startsWith('ja'))
    if (jpVoice) utterance.voice = jpVoice
    
    window.speechSynthesis.speak(utterance)
    setSelected(item.char)
  }

  const getSelectedInfo = () => {
    const all = [...JAP_DATA.hiragana, ...JAP_DATA.katakana, ...JAP_DATA.kanji]
    return all.find(item => item.char === selected)
  }

  const selectedInfo = getSelectedInfo()

  return (
    <div className="p-6 pb-32 max-w-md mx-auto">
      <header className="text-center mb-8 pt-8">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Alphabets Japonais</h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2">Appuyez pour écouter</p>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mt-6">
            {['hiragana', 'katakana', 'kanji'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setCurrentTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                        currentTab === tab 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </header>

      {currentTab === 'hiragana' && <Section title="Hiragana (Base)" data={JAP_DATA.hiragana} selected={selected} onSelect={playSound} />}
      {currentTab === 'katakana' && <Section title="Katakana (Base)" data={JAP_DATA.katakana} selected={selected} onSelect={playSound} />}
      {currentTab === 'kanji' && <Section title="Kanji (Débutant N5)" data={JAP_DATA.kanji} selected={selected} onSelect={playSound} showMeaning={true} />}

      {selected && selectedInfo && (
        <div className="fixed bottom-24 left-6 right-6 bg-slate-900 dark:bg-blue-600 text-white p-5 rounded-[2rem] shadow-2xl flex justify-between items-center animate-slide-up z-40 border border-slate-700 dark:border-blue-500">
          <div>
            <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest block mb-1">Prononciation</span>
            <p className="font-bold text-2xl leading-none">{selectedInfo.rom}</p>
            {selectedInfo.meaning && <p className="text-xs text-slate-300 dark:text-blue-100 mt-1 italic">{selectedInfo.meaning}</p>}
          </div>
          <span className="text-5xl font-black">{selected}</span>
        </div>
      )}
    </div>
  )
}
