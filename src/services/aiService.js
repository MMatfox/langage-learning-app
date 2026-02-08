import { supabase } from '../supabaseClient';

const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const BASE_URL = "https://api.mistral.ai/v1/chat/completions";

// --- HELPER : Récupérer les préférences de l'utilisateur ---
const getUserPreferences = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { target: 'Coréen', ui: 'Français' }; // Valeurs par défaut

    const { data } = await supabase
      .from('profiles')
      .select('target_language, ui_language')
      .eq('id', user.id)
      .single();

    return { 
      target: data?.target_language || 'Coréen', 
      ui: data?.ui_language || 'Français' 
    };
  } catch (e) {
    console.error("Erreur récupération préférences:", e);
    return { target: 'Coréen', ui: 'Français' };
  }
};

// 1. GÉNÉRATION DE NOUVEAU MOT
export const generateNewWord = async (alreadyLearnedWords, userLevel) => {
  const { target, ui } = await getUserPreferences();

  const prompt = `
    Agis comme un professeur expert.
    Génère un NOUVEAU mot en ${target} pour un élève de niveau ${userLevel}.
    Exclus ces mots : ${alreadyLearnedWords.join(", ")}.
    
    L'utilisateur parle ${ui}. Fournis la traduction et les exemples en ${ui}.
    
    Réponds UNIQUEMENT avec ce JSON :
    {
      "word": "Mot en ${target}",
      "romanization": "Prononciation/Romanisation (si applicable, sinon vide)",
      "translation": "Traduction en ${ui}",
      "example_kr": "Phrase d'exemple en ${target}",
      "example_fr": "Traduction de la phrase en ${ui}"
    }
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Erreur Mistral Word:", error);
    throw error;
  }
};

// 2. GÉNÉRATION DE LEÇON
export const generateNewLesson = async (completedLessons, userLevel) => {
  const { target, ui } = await getUserPreferences();
  
  const excludedTopics = completedLessons.length > 0 
    ? `Sujets déjà traités : ${completedLessons.join(", ")}.`
    : "Première leçon.";
  
  const prompt = `Tu es un professeur de ${target}. L'élève parle ${ui}.
Crée une leçon complète de niveau ${userLevel}.

${excludedTopics}

RÈGLES STRICTES :
1. "explanation": Un texte pédagogique clair en ${ui}.
2. "vocabulary": Entre 5 et 10 mots/expressions en ${target}.
3. "details": Explique la grammaire/usage en ${ui}.
4. "quiz": 3 questions en ${ui} portant sur le ${target}.

Réponds UNIQUEMENT avec ce JSON exact :
{
  "title": "Titre en ${ui}",
  "explanation": "Explication en ${ui}...",
  "vocabulary": [
    {
      "kr": "mot ${target}", 
      "romanization": "romanisation", 
      "fr": "traduction ${ui}",
      "details": "Détails usage en ${ui}",
      "context": "Exemple en ${target}"
    }
  ],
  "quiz": [
    {
      "question": "Question en ${ui}...",
      "options": ["A", "B", "C"],
      "answer": "A"
    }
  ]
}`;
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const lessonData = JSON.parse(data.choices[0].message.content);
    
    // Nettoyage
    if (typeof lessonData.explanation !== 'string') {
      lessonData.explanation = typeof lessonData.explanation === 'object' 
        ? Object.values(lessonData.explanation).join('\n\n') 
        : String(lessonData.explanation);
    }
    return lessonData;
  } catch (error) {
    console.error("Erreur Mistral Lesson:", error);
    throw error;
  }
};

// 3. CHAT AVEC LE TUTEUR
export const chatWithTutor = async (history, message) => {
  const { target, ui } = await getUserPreferences();

  const formattedHistory = history.map(msg => ({
    role: (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user',
    content: msg.text || msg.parts?.[0]?.text || ""
  })).filter(m => m.content);

  const systemPrompt = `Tu es un tuteur de ${target} patient. 
  Ton élève parle ${ui}. 
  Réponds principalement en ${target} (pour faire pratiquer) mais explique les concepts difficiles en ${ui} si nécessaire.
  Sois encourageant.`;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: message }
        ]
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Erreur Chat:", error);
    throw error;
  }
};

// 4. QUIZ DE RÉVISION
export const generateRevisionQuiz = async (lessonTitle, vocabulary) => {
  const { target, ui } = await getUserPreferences();
  const vocabString = vocabulary ? vocabulary.map(v => `${v.kr} (${v.fr})`).join(", ") : "Général";

  const prompt = `
    Sujet: ${target}. Langue élève: ${ui}.
    Leçon : "${lessonTitle}". Vocabulaire : ${vocabString}.
    
    Génère 3 questions QCM en ${ui} pour tester la compréhension de ce vocabulaire ${target}.
    
    Réponds UNIQUEMENT avec ce JSON :
    [{"question": "...", "options": ["A", "B", "C"], "answer": "A"}, ...]
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    return Array.isArray(content) ? content : (content.questions || content.quiz || []);
  } catch (error) {
    console.error("Erreur Quiz:", error);
    throw error;
  }
};