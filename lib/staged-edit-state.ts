export type FlatDraft = Record<string, string>

export interface StagedDraft<T extends FlatDraft = FlatDraft> {
    original: T
    current: T
}

export type StagedDraftMap<T extends FlatDraft = FlatDraft> = Record<string, StagedDraft<T>>

export function createStagedDraft<T extends FlatDraft>(draft: T): StagedDraft<T> {
    return {
        original: { ...draft },
        current: { ...draft },
    }
}

export function hasStagedChanges<T extends FlatDraft>(draft: StagedDraft<T> | undefined) {
    if (!draft) return false

    const keys = new Set([...Object.keys(draft.original), ...Object.keys(draft.current)])
    for (const key of keys) {
        if ((draft.original[key] || '') !== (draft.current[key] || '')) {
            return true
        }
    }
    return false
}

export function getDirtyStagedIds<T extends FlatDraft>(drafts: StagedDraftMap<T>) {
    return Object.entries(drafts)
        .filter(([, draft]) => hasStagedChanges(draft))
        .map(([id]) => id)
}

export function patchStagedDraft<T extends FlatDraft>(
    drafts: StagedDraftMap<T>,
    id: string,
    key: keyof T & string,
    value: string
) {
    const existing = drafts[id]
    if (!existing) return drafts

    return {
        ...drafts,
        [id]: {
            ...existing,
            current: {
                ...existing.current,
                [key]: value,
            },
        },
    }
}

export function removeStagedDraft<T extends FlatDraft>(drafts: StagedDraftMap<T>, id: string) {
    const next = { ...drafts }
    delete next[id]
    return next
}
