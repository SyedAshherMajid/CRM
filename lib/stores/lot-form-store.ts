import { create } from "zustand"

export interface PhoneEntry {
  imei: string
  storage: string
  color: string
  condition: string
  batteryHealth?: number
}

export interface PhoneGroup {
  id: string
  brand: "iPhone" | "Google Pixel"
  model: string
  storage: string
  color: string
  condition: string
  batteryHealth?: number
  costPrice: number
  ptaStatus: string
  quantity: number
  phones: PhoneEntry[]
}

interface LotFormStore {
  step: 1 | 2
  name: string
  supplierId: string
  totalAmount: string
  amountPaid: string
  notes: string
  groups: PhoneGroup[]
  setStep: (step: 1 | 2) => void
  setField: (field: "name" | "supplierId" | "totalAmount" | "amountPaid" | "notes", value: string) => void
  addGroup: (group: Omit<PhoneGroup, "id" | "phones">) => void
  removeGroup: (id: string) => void
  updateIMEI: (groupId: string, phoneIdx: number, imei: string) => void
  updatePhoneField: (groupId: string, phoneIdx: number, updates: Partial<Omit<PhoneEntry, "imei">>) => void
  totalPhones: () => number
  reset: () => void
}

export const useLotFormStore = create<LotFormStore>((set, get) => ({
  step: 1,
  name: "",
  supplierId: "",
  totalAmount: "",
  amountPaid: "",
  notes: "",
  groups: [],

  setStep: (step) => set({ step }),

  setField: (field, value) => set({ [field]: value }),

  addGroup: (group) =>
    set((state) => ({
      groups: [
        ...state.groups,
        {
          ...group,
          id: crypto.randomUUID(),
          phones: Array.from({ length: group.quantity }, () => ({
            imei: "",
            storage: group.storage,
            color: group.color,
            condition: group.condition,
            batteryHealth: group.batteryHealth,
          })),
        },
      ],
    })),

  removeGroup: (id) =>
    set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

  updateIMEI: (groupId, phoneIdx, imei) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              phones: g.phones.map((p, i) => (i === phoneIdx ? { ...p, imei } : p)),
            }
      ),
    })),

  updatePhoneField: (groupId, phoneIdx, updates) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              phones: g.phones.map((p, i) => (i === phoneIdx ? { ...p, ...updates } : p)),
            }
      ),
    })),

  totalPhones: () => get().groups.reduce((sum, g) => sum + g.quantity, 0),

  reset: () =>
    set({ step: 1, name: "", supplierId: "", totalAmount: "", amountPaid: "", notes: "", groups: [] }),
}))
