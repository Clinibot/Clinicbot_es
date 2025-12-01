/*
  # Fix Language Codes in Agents Table

  1. Updates
    - Update existing language codes to match API requirements
    - Convert short codes (es, en, etc.) to full codes (es-ES, en-US, etc.)

  2. Important Notes
    - This ensures compatibility with the external API
    - Default to Spanish (Spain) for any unrecognized codes
*/

-- Update language codes to match API requirements
UPDATE agents
SET language = CASE 
  WHEN language = 'es' THEN 'es-ES'
  WHEN language = 'en' THEN 'en-US'
  WHEN language = 'ca' THEN 'ca-ES'
  WHEN language = 'fr' THEN 'fr-FR'
  WHEN language = 'de' THEN 'de-DE'
  WHEN language = 'pt' THEN 'pt-PT'
  ELSE 'es-ES'
END
WHERE language IN ('es', 'en', 'ca', 'fr', 'de', 'pt')
   OR language NOT LIKE '%-%';