const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

function isLocalDevelopmentHost(hostname) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || /^10(?:\.\d{1,3}){3}$/.test(hostname)
    || /^192\.168(?:\.\d{1,3}){2}$/.test(hostname)
    || /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(hostname)
}

function resolveApiBaseUrl() {
  const url = new URL(configuredApiBaseUrl)
  if (
    typeof window !== "undefined"
    && isLocalDevelopmentHost(window.location.hostname)
    && isLocalDevelopmentHost(url.hostname)
  ) {
    // Keep browser API requests on the page's host so Lax cookies remain same-site.
    url.hostname = window.location.hostname
  }
  return url.toString().replace(/\/+$/, "")
}

const apiBaseUrl = resolveApiBaseUrl()

export async function apiGet(path, params, signal) {
  const url = new URL(`${apiBaseUrl}${path}`)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const response = await fetch(url, {
    credentials: "include",
    signal,
    cache: "no-store",
  })
  return readResponse(response)
}

export async function apiPost(path, body, csrfToken) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(body),
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
