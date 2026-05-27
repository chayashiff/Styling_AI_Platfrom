import { rankWithFallback } from "./fallbackRecommendationService.js";

async function getRecommendations(userProfile, candidateProducts) {
  return {
    source: "local_fallback",
    recommendations: rankWithFallback(userProfile, candidateProducts),
  };
}

export { getRecommendations };
