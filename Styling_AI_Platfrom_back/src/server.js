// מאפשר לשרת לקבל בקשות מה-frontend גם אם הוא רץ על כתובת אחרת.
import cors from "cors";
// Express משמש לבניית ה-API של שירות ההמלצות.
import express from "express";

// הקונטרולר מרכז את כל הלוגיקה של בקשת ההמלצות.
import { getRecommendationController } from "./controllers/recommendationController.js";

// יוצר את אפליקציית Express שעליה נגדיר routes.
const app = express();
// הפורט שעליו השרת יאזין בזמן פיתוח.
const PORT = 3000;

// מאפשר בקשות cross-origin מה-frontend.
app.use(cors());
// מאפשר לשרת לקרוא JSON מתוך גוף הבקשה.
app.use(express.json());

// endpoint פשוט לבדיקת חיים של השרת.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// endpoint ראשי שמקבל פרופיל משתמש ומחזיר המלצות מותאמות.
app.post("/recommendations", getRecommendationController);

// מפעיל את השרת ומדפיס הודעה כדי שנדע שהוא עלה.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
