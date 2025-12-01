/*
  # Update Agents to Multi-Language

  1. Updates
    - Set all existing agents to 'multi' language for compatibility
    - This allows agents to work with any language automatically

  2. Important Notes
    - 'multi' is the recommended setting for most use cases
    - Ensures compatibility with Retell AI API
*/

UPDATE agents
SET language = 'multi'
WHERE language IS NOT NULL;