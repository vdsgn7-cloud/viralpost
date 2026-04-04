import { create } from 'zustand'

export interface Writer {
  id: string
  user_id: string
  nome: string
  avatar_emoji: string
  avatar_url?: string
  nicho_principal: string
  publico_alvo: string
  tom: string
  formalidade: string
  evitar: string[]
  tamanho_copy: string
  descricao_pessoal?: string
  exemplo_post?: string
  palavras_chave?: string[]
  is_preset: boolean
  created_at: string
}

export interface GeneratedPost {
  post: any
  formato: string
  nicho: string
  redeSocial: string
}

interface AppState {
  writers: Writer[]
  activeWriter: Writer | null
  currentPost: GeneratedPost | null
  currentTrend: any | null
  currentStyle: any | null
  avatarDataUrl: string | null
  currentSlide: number
  currentSlides: any[]
  setWriters: (writers: Writer[]) => void
  setActiveWriter: (writer: Writer | null) => void
  setCurrentPost: (post: GeneratedPost | null) => void
  setCurrentTrend: (trend: any) => void
  setCurrentStyle: (style: any) => void
  setAvatarDataUrl: (url: string | null) => void
  setCurrentSlide: (slide: number) => void
  setCurrentSlides: (slides: any[]) => void
}

export const useAppStore = create<AppState>((set) => ({
  writers: [],
  activeWriter: null,
  currentPost: null,
  currentTrend: null,
  currentStyle: null,
  avatarDataUrl: null,
  currentSlide: 0,
  currentSlides: [],
  setWriters: (writers) => set({ writers }),
  setActiveWriter: (activeWriter) => set({ activeWriter }),
  setCurrentPost: (currentPost) => set({ currentPost }),
  setCurrentTrend: (currentTrend) => set({ currentTrend }),
  setCurrentStyle: (currentStyle) => set({ currentStyle }),
  setAvatarDataUrl: (avatarDataUrl) => set({ avatarDataUrl }),
  setCurrentSlide: (currentSlide) => set({ currentSlide }),
  setCurrentSlides: (currentSlides) => set({ currentSlides }),
}))
