export function normalize(text: string) {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function splitWords(text: string) {
    return normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

export function editDistance(left: string, right: string) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        let diagonal = previous[0]
        previous[0] = leftIndex
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const above = previous[rightIndex]
            previous[rightIndex] = Math.min(
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + 1,
                diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
            )
            diagonal = above
        }
    }
    return previous[right.length]
}

function closeness(token: string, word: string) {
    if (word === token) return 1
    if (word.length >= 3 && token.length >= 3 && (word.startsWith(token) || token.startsWith(word))) {
        return Math.min(word.length, token.length) / Math.max(word.length, token.length)
    }
    return 1 - editDistance(token, word) / Math.max(token.length, word.length)
}

/**
 * The word in `words` closest to `token`, scored 1 for an exact word down to 0.6 for
 * close typos or partial words. Below 0.6 there is no match (score 0, word null).
 */
export function closestWord(token: string, words: string[]) {
    let best = { word: null as string | null, score: 0 }
    for (const word of words) {
        const score = closeness(token, word)
        if (score > best.score) best = { word, score }
        if (score === 1) break
    }
    return best.score >= 0.6 ? best : { word: null, score: 0 }
}

function queryTokens(query: string) {
    return splitWords(query).filter((token) => token.length > 1)
}

/**
 * Average closeness of each query word to its best match in `text`.
 * A query word with no close match counts as 0.
 */
export function fuzzyScore(query: string, text: string) {
    const tokens = queryTokens(query)
    if (tokens.length === 0) return 0
    const words = splitWords(text)
    const total = tokens.reduce((sum, token) => sum + closestWord(token, words).score, 0)
    return total / tokens.length
}

/** `query` with each word replaced by its closest match in `text`, e.g. "kyotto" to "kyoto". */
export function correctQuery(query: string, text: string) {
    const words = splitWords(text)
    return queryTokens(query)
        .map((token) => closestWord(token, words).word ?? token)
        .join(' ')
}
