const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "")

export async function apiGet(path, params, signal) {
  const url = new URL(`${apiBaseUrl}${path}`)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const response = await fetch(url, {
    signal,
    cache: "no-store",
  })
  return readResponse(response)
}

async function readResponse(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail || Object.values(payload || {}).flat().join(" ")
    throw new Error(detail || `Request failed (${response.status})`)
  }
  return payload
}
