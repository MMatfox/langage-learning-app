const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;
const BASE_URL = "https://api.mistral.ai/v1/chat/completions";

// 1. GÉNÉRATION DE MOT (On veut du JSON)
export const generateNewWord = async (alreadyLearnedWords, userLevel) => {
  const prompt = `
    Génère un NOUVEAU mot coréen pour niveau ${userLevel}.
    Exclus ces mots : ${alreadyLearnedWords.join(", ")}.
    Réponds UNIQUEMENT avec ce JSON :
    {
      "word": "Hangul",
      "romanization": "Romaja",
      "translation": "Français",
      "example_kr": "Phrase KR",
      "example_fr": "Phrase FR"
    }
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Erreur Mistral Word:", error);
    throw error;
  }
};

// 2. GÉNÉRATION DE LEÇON (On veut du JSON) - VERSION CORRIGÉE
export const generateNewLesson = async (completedLessons, userLevel) => {
  const excludedTopics = completedLessons.length > 0 
    ? `Sujets déjà traités (à éviter) : ${completedLessons.join(", ")}.`
    : "Première leçon pour cet utilisateur.";
  
  const prompt = `Tu es un professeur de coréen. Crée une leçon de niveau ${userLevel} (1=débutant, 5=avancé).

${excludedTopics}

RÈGLES STRICTES :
1. Le champ "explanation" doit être UN SEUL PARAGRAPHE de texte continu (pas d'objet, pas de sous-parties)
2. Fournis exactement 3 mots de vocabulaire
3. Une seule question de quiz avec 3 options

Réponds UNIQUEMENT avec ce JSON exact :
{
  "title": "Titre court de la leçon",
  "explanation": "Un paragraphe explicatif unique qui détaille le concept de façon claire et pédagogique, sans subdivision.",
  "vocabulary": [
    {"kr": "mot1", "fr": "traduction1"},
    {"kr": "mot2", "fr": "traduction2"},
    {"kr": "mot3", "fr": "traduction3"}
  ],
  "quiz": [
    {
      "question": "Question claire en français",
      "options": ["Option A", "Option B", "Option C"],
      "answer": "Option A"
    }
  ]
}`;
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [
          { 
            role: "system", 
            content: "Tu es un assistant qui génère UNIQUEMENT du JSON valide. Ne réponds jamais avec du texte en dehors du JSON." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    const lessonData = JSON.parse(data.choices[0].message.content);
    
    // VALIDATION STRICTE : On force explanation à être une string
    if (typeof lessonData.explanation !== 'string') {
      console.warn("⚠️ L'API a renvoyé un objet pour explanation, conversion en texte...");
      
      // Si c'est un objet, on le convertit en texte lisible
      if (typeof lessonData.explanation === 'object') {
        lessonData.explanation = Object.entries(lessonData.explanation)
          .map(([key, value]) => `${key.replace(/_/g, ' ')} : ${value}`)
          .join('. ');
      } else {
        lessonData.explanation = String(lessonData.explanation);
      }
    }
    
    // Validation des autres champs
    if (!Array.isArray(lessonData.vocabulary)) {
      lessonData.vocabulary = [];
    }
    
    if (!Array.isArray(lessonData.quiz) || lessonData.quiz.length === 0) {
      lessonData.quiz = [{
        question: "Question de révision",
        options: ["Option 1", "Option 2", "Option 3"],
        answer: "Option 1"
      }];
    }
    
    return lessonData;
  } catch (error) {
    console.error("Erreur Mistral Lesson:", error);
    throw error;
  }
};

// 3. CHAT AVEC LE TUTEUR (On veut du TEXTE !)
export const chatWithTutor = async (history, message) => {
  const formattedHistory = history
    .map(msg => {
      let cleanText = msg.text;
      
      if (!cleanText && msg.parts && msg.parts[0]) {
        cleanText = msg.parts[0].text;
      }

      if (!cleanText || cleanText.trim() === "") {
        return null;
      }

      return {
        role: (msg.role === 'model' || msg.role === 'assistant') ? 'assistant' : 'user',
        content: cleanText
      };
    })
    .filter(msg => msg !== null);

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [
          { 
            role: "system", 
            content: "Tu es Ji-min, un tuteur de coréen patient. Réponds en coréen et aide l'élève en français si nécessaire." 
          },
          ...formattedHistory,
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Erreur Mistral API:", data);
      throw new Error(data.error?.message || "Erreur API");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Erreur Chat:", error);
    throw error;
  }
};


export const generateRevisionQuiz = async (lessonTitle, vocabulary) => {
  // On formate le vocabulaire pour le prompt
  const vocabString = vocabulary.map(v => `${v.kr} (${v.fr})`).join(", ");

  const prompt = `
    Je veux réviser la leçon de coréen intitulée : "${lessonTitle}".
    Vocabulaire clé de cette leçon : ${vocabString}.
    
    Génère un QUIZ DE RÉVISION de 3 questions (choix multiple) pour tester la compréhension de ce vocabulaire et du contexte.
    
    Réponds UNIQUEMENT avec ce JSON strict :
    [
      {
        "question": "Question 1...",
        "options": ["Choix A", "Choix B", "Choix C"],
        "answer": "Choix A"
      },
      {
        "question": "Question 2...",
        "options": ["Choix A", "Choix B", "Choix C"],
        "answer": "Choix B"
      },
      {
        "question": "Question 3...",
        "options": ["Choix A", "Choix B", "Choix C"],
        "answer": "Choix C"
      }
    ]
  `;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "open-mistral-7b",
        messages: [
          { role: "system", content: "Tu es un générateur de quiz JSON strict." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    // Mistral renvoie souvent un objet { "questions": [...] } ou directement le tableau
    const content = JSON.parse(data.choices[0].message.content);
    
    // Sécurisation du format de retour
    if (Array.isArray(content)) return content;
    if (content.questions && Array.isArray(content.questions)) return content.questions;
    if (content.quiz && Array.isArray(content.quiz)) return content.quiz;
    
    // Fallback si la structure est bizarre
    return Object.values(content)[0] || [];

  } catch (error) {
    console.error("Erreur Revision Quiz:", error);
    throw error;
  }
};