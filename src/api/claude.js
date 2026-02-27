function parseJsonWithFallback(text) {
  // First, try to parse the whole string as JSON.
  try {
    return JSON.parse(text)
  } catch {
    // If that fails, try to find the most likely JSON object(s) inside the text.
    const matches = text.match(/\{[\s\S]*?\}/g)
    if (!matches) {
      throw new Error('Claude returned non‑JSON response')
    }

    for (const candidate of matches) {
      try {
        const parsed = JSON.parse(candidate)
        if (
          parsed &&
          typeof parsed === 'object' &&
          'step' in parsed &&
          'why' in parsed
        ) {
          return parsed
        }
      } catch {
        // Ignore individual parse failures and keep trying other candidates.
      }
    }

    throw new Error('Claude returned non‑JSON response')
  }
}

export async function generateStep({ originalGoal, taskType, stepHistory }) {
  const stepsText =
    !stepHistory || stepHistory.length === 0
      ? 'none'
      : stepHistory
          .map((s, idx) => `${idx + 1}. ${s.step}`)
          .join('\n')

  const prompt = `
The user wants to: ${originalGoal}
Task type: ${taskType}
Steps already completed:
${stepsText}

Generate TWO things as JSON: 
{
  "step": "one micro first-step so small it feels embarrassing not to do. Under 15 words. Must match the task type context. If task is coding, give a coding step. If writing, give a writing step. Etc. Friendly tone. No preamble.",
  "why": "one sentence of real ADHD neuroscience (max 15 words) explaining why this tiny action helps ADHD brains. Reference dopamine, working memory, or executive function. No fluff."
}
Return only valid JSON.
`.trim()

  const res = await fetch('http://localhost:3001/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, originalGoal })
  })

  if (!res.ok) {
    throw new Error('Failed to contact step generator')
  }

  const text = await res.text()
  return parseJsonWithFallback(text)
}

export async function makeStepSmaller({ originalGoal, taskType, stepHistory, previousStep }) {
  const stepsText =
    !stepHistory || stepHistory.length === 0
      ? 'none'
      : stepHistory
          .map((s, idx) => `${idx + 1}. ${s.step}`)
          .join('\n')

  const prompt = `
The user wants to: ${originalGoal}
Task type: ${taskType}
Steps already completed:
${stepsText}

Make the previous step even smaller:
${previousStep}

Generate TWO things as JSON: 
{
  "step": "an even smaller micro-step, still under 15 words, that matches the task type. Friendly tone, no preamble.",
  "why": "one sentence of real ADHD neuroscience (max 15 words) explaining why this even smaller action helps ADHD brains. Reference dopamine, working memory, or executive function. No fluff."
}
Return only valid JSON.
`.trim()

  const res = await fetch('http://localhost:3001/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, originalGoal })
  })

  if (!res.ok) {
    throw new Error('Failed to contact step generator')
  }

  const text = await res.text()
  return parseJsonWithFallback(text)
}
