// טוען משתני סביבה כדי לקחת את GROQ_API_KEY מקובץ .env.
import "dotenv/config";
// לקוח Groq שמאפשר לבדוק קריאה ישירה למודל מהטרמינל.
import Groq from "groq-sdk";
// מאפשר לקבל שאלה מהמשתמש דרך הטרמינל.
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// מפתח ה-API נדרש כדי לבצע בדיקת חיבור אמיתית מול Groq.
const apiKey = process.env.GROQ_API_KEY;

// אם אין מפתח API, עוצרים מיד עם הודעה ברורה במקום לקבל שגיאה לא מובנת מ-Groq.
if (!apiKey || apiKey.trim() === "") {
  console.error("Groq API call failed:");
  console.error("GROQ_API_KEY is missing. Add your API key to the .env file.");
  process.exit(1);
}

// יוצר חיבור ל-Groq עם המפתח מהסביבה.
const groq = new Groq({ apiKey });
// פותח ממשק קריאה מהטרמינל כדי לשאול את המשתמש מה לשלוח למודל.
const terminal = readline.createInterface({ input, output });

try {
  // מקבל שאלה חופשית כדי לבדוק שהמודל עונה לפני שמשלבים אותו בזרימת ההמלצות.
  const userQuestion = await terminal.question("Write your question for Groq: ");

  // מונע שליחת שאלה ריקה ל-Groq וחוסך קריאה מיותרת ל-API.
  if (!userQuestion.trim()) {
    throw new Error("Question is empty. Please write a question and try again.");
  }

  // שולח את השאלה למודל ומחכה לתשובה.
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: userQuestion,
      },
    ],
  });
  const response = completion.choices[0]?.message?.content;

  // מדפיס את התשובה כדי לוודא שהחיבור ל-Groq עובד.
  console.log(" response:", response);
} catch (error) {
  // מציג שגיאות בצורה קריאה כדי שיהיה קל להבין אם הבעיה במפתח, ברשת או בבקשה.
  console.error("Groq API call failed:");
  console.error(error.message);
  process.exit(1);
} finally {
  // סוגר את ממשק הטרמינל גם במקרה של הצלחה וגם במקרה של שגיאה.
  terminal.close();
}
