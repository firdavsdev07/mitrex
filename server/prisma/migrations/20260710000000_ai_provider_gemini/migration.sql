-- Rename AiProvider enum value OPENAI -> GEMINI (switching AI fallback provider)
ALTER TYPE "AiProvider" RENAME VALUE 'OPENAI' TO 'GEMINI';
