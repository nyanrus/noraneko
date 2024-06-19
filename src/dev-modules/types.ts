export interface HotMessage {
  distUrl: string
  syntaxError: boolean
}
export interface Inited {
  setData: (data: unknown) => void
}
import './declare'

export type Hot = ImportMeta['hot']