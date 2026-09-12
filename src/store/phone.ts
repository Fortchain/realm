import { create } from "zustand"

interface PhoneStore {
  isOpen: boolean
  activeTab: "feed" | "messages" | "contacts" | "todos"
  open: (tab?: PhoneStore["activeTab"]) => void
  close: () => void
  setTab: (tab: PhoneStore["activeTab"]) => void
}

export const usePhoneStore = create<PhoneStore>((set) => ({
  isOpen: false,
  activeTab: "todos",
  open: (tab = "todos") => set({ isOpen: true, activeTab: tab }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ activeTab: tab }),
}))
