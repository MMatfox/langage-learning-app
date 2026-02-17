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

  const nbLearned = alreadyLearnedWords.length;
  // On limite la liste envoyée au prompt pour éviter de saturer le contexte (les doublons sont revérifiés côté client)
  const exclusionListPrompt = alreadyLearnedWords.slice(0, 200).join(", ") + (nbLearned > 200 ? "..." : "");

  const complexityInstruction = nbLearned < 60 
    ? "C'est un VRAI DÉBUTANT. Donne un mot ESSENTIEL simple et courant (Ex: maison, manger, eau, mère, grand, froid). Évite les mots abstraits."
    : nbLearned < 300
    ? "Niveau débutant. Donne un mot de la vie quotidienne (vie active, ville, émotions simples)."
    : "Niveau intermédiaire. Donne un mot utile pour des conversations variées.";

  const prompt = `
    Agis comme un professeur expert.
    
    TÂCHE : Génère un seul NOUVEAU mot en ${target}.
    CONTEXTE : L'élève a déjà appris ${nbLearned} mots.
    INSTRUCTION DE DIFFICULTÉ : ${complexityInstruction}
    
    RÈGLES ABSOLUES :
    1. EXCLUSION IMPORTANTE : Évite les mots de cette liste : ${exclusionListPrompt}.
    2. Si les basiques sont pris, cherche : couleurs, chiffres, animaux, vêtements, verbes d'action.
    3. PAS DE DOUBLONS.
    
    L'utilisateur parle ${ui}. Fournis la traduction et les exemples en ${ui}.
    
    Réponds UNIQUEMENT avec ce JSON :
    {
      "word": "Mot en ${target}",
      "romanization": "Prononciation/Romanisation (si applicable, sinon vide)",
      "translation": "Traduction en ${ui}",
      "example_kr": "Phrase d'exemple très simple en ${target}",
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
  
  // ÉTAPE 1 : CONTENU PÉDAGOGIQUE
  const contentPrompt = `Tu es un professeur de ${target}. L'élève parle ${ui}.
Crée une leçon complète de niveau ${userLevel}.

${excludedTopics}

RÈGLES STRICTES :
1. "explanation": Un texte pédagogique clair, structuré et DÉTAILLÉ en ${ui} (minimum 150 mots).
2. "vocabulary": Liste de 10 à 15 mots/expressions en ${target} (couvrant tout le contenu).
3. "details": Explique la grammaire/usage en ${ui}.
4. NE GÉNÈRE PAS DE QUIZ MAINTENANT.

Réponds UNIQUEMENT avec ce JSON exact :
{
  "title": "Titre en ${ui}",
  "explanation": "Explication détaillée en ${ui}...",
  "vocabulary": [
    {
      "kr": "mot ${target}", 
      "romanization": "romanisation", 
      "fr": "traduction ${ui}",
      "details": "Détails usage en ${ui}",
      "context": "Exemple en ${target}"
    }
  ]
}`;
  
  try {
    // Appel 1 : Leçon
    const responseLesson = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: contentPrompt }],
        max_tokens: 4000, // Augmenter token limit
        response_format: { type: "json_object" }
      })
    });

    const dataLesson = await responseLesson.json();
    const lessonData = JSON.parse(dataLesson.choices[0].message.content);
    
    // Nettoyage format explication
    if (typeof lessonData.explanation !== 'string') {
      lessonData.explanation = typeof lessonData.explanation === 'object' 
        ? Object.values(lessonData.explanation).join('\n\n') 
        : String(lessonData.explanation);
    }

    // ÉTAPE 2 : QUIZ (10 questions)
    // On utilise les données générées pour créer le quiz
    const vocabString = lessonData.vocabulary ? lessonData.vocabulary.map(v => `${v.kr} (${v.fr})`).join(", ") : "Général";
    const quizPrompt = `
      Sujet: ${target}. Langue élève: ${ui}.
      Leçon : "${lessonData.title}".
      Vocabulaire à tester : ${vocabString}.
      
      Génère 10 questions QCM en ${ui}.
      
      Réponds UNIQUEMENT avec ce JSON :
      [{"question": "...", "options": ["Choix 1", "Choix 2", "Choix 3"], "answer": "Choix 1"}, ...]
      IMPORTANT: "answer" doit être la chaîne de caractères exacte de la bonne réponse dans "options".
      Mélange aléatoirement la position de la bonne réponse.
    `;

    const responseQuiz = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: quizPrompt }],
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    const dataQuiz = await responseQuiz.json();
    const rawQuiz = JSON.parse(dataQuiz.choices[0].message.content);
    // Gestion format { quiz: [...] } ou [...] 
    const quizContent = Array.isArray(rawQuiz) ? rawQuiz : (rawQuiz.quiz || rawQuiz.questions || []);

    // FUSION
    return { ...lessonData, quiz: quizContent };

  } catch (error) {
    console.error("Erreur Mistral Lesson (Step mode):", error);
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

// 4. QUIZ DE RÉVISION (ou retry leçon)
export const generateRevisionQuiz = async (lessonTitle, vocabulary, count = 3) => {
  const { target, ui } = await getUserPreferences();
  const vocabString = vocabulary ? vocabulary.map(v => `${v.kr} (${v.fr})`).join(", ") : "Général";

  const prompt = `
    Sujet: ${target}. Langue élève: ${ui}.
    Leçon : "${lessonTitle}". Vocabulaire : ${vocabString}.
    
    Génère ${count} questions QCM en ${ui} pour tester la compréhension de ce vocabulaire ${target}.
    
    Réponds UNIQUEMENT avec ce JSON :
    [{"question": "...", "options": ["Choix 1", "Choix 2", "Choix 3"], "answer": "Choix 1"}, ...]
    IMPORTANT: "answer" doit être la chaîne de caractères exacte de la bonne réponse dans "options".
    Mélange aléatoirement la position de la bonne réponse.
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

// 5. METTRE À JOUR LA TRADUCTION D'UN MOT (Changement de langue)
export const updateWordTranslation = async (wordData) => {
  const { target, ui } = await getUserPreferences();
  
  const prompt = `
    Tu es un professeur expert de ${target}.
    L'utilisateur parle maintenant ${ui}.
    
    Mets à jour la fiche du mot : "${wordData.word}".
    
    Fournis :
    1. La "translation" en ${ui}.
    2. "example_kr" (une phrase d'exemple en ${target}).
    3. "example_fr" (la traduction de l'exemple en ${ui}).
    4. "romanization" (mise à jour si besoin).
    
    Réponds UNIQUEMENT avec ce JSON :
    {
      "translation": "...",
      "romanization": "...",
      "example_kr": "...",
      "example_fr": "..."
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
    console.error("Erreur Update Word:", error);
    throw error;
  }
};

// 6. METTRE À JOUR UNE LEÇON (Changement de langue)
export const updateLessonContent = async (oldLessonTitle, userLevel = 1) => {
  const { target, ui } = await getUserPreferences();
  
  const prompt = `
    Tu es un professeur de ${target}. L'élève parle maintenant ${ui}.
    Recrée le contenu de la leçon : "${oldLessonTitle}".
    
    RÈGLES :
    1. "explanation": Explique le sujet en ${ui} (pédagogique et clair).
    2. "vocabulary": Fournis de nouveau le vocabulaire clé (10-15 mots) pour ce sujet, avec traductions/explications en ${ui}.
    
    Réponds UNIQUEMENT avec ce JSON :
    {
      "title": "${oldLessonTitle}",
      "explanation": "...",
      "vocabulary": [
        {
          "kr": "...", 
          "romanization": "...", 
          "fr": "traduction en ${ui}",
          "details": "...",
          "context": "..."
        }
      ]
    }
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    let content = JSON.parse(data.choices[0].message.content);
    
    // Nettoyage format
    if (typeof content.explanation !== 'string') {
      content.explanation = typeof content.explanation === 'object' 
        ? Object.values(content.explanation).join('\n\n') 
        : String(content.explanation);
    }
    
    return content;
  } catch (error) {
    console.error("Erreur Update Lesson:", error);
    throw error;
  }
};