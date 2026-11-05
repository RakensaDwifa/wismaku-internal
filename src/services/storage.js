export function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function writeList(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Ignore storage quota
  }
}

export function readObject(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeObject(key, obj) {
  try {
    if (obj === null || obj === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(obj))
    }
  } catch {
    // Ignore storage quota
  }
}

export function notify(event, detail) {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(event, { detail }))
  }
}
