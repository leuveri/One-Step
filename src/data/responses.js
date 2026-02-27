export const responses = {
  celebrating: [],
  concerned: [],
  checkin: [],
  wrapup: [],
  encouragement: [],
  fallback: []
}

export function getRandom(category) {
  const list = responses[category]
  if (!list || list.length === 0) return null
  return list[Math.floor(Math.random() * list.length)]
}
