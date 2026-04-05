Whenever running server make sure to run these commands before npm run dev:

set GEMINI_API_KEY=AIzaSyADfj7q31pRmCycX7ZmYcxh2gdHTeOvPqs

use this command to find available models with quota:
curl "https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyADfj7q31pRmCycX7ZmYcxh2gdHTeOvPqs" | findstr /I "models/ supportedGenerationMethods generateContent preview audio"

Working Models (must set one before running server):

set GEMINI_MODEL=gemini-flash-latest
set GEMINI_MODEL=gemini-2.5-computer-use-preview-10-2025


Use this if out of quota for gemini models:

set OLLAMA_MODEL=llama3.1:8b
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set AI_PROVIDER=ollama
