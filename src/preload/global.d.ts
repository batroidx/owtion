import type { OwtionApi } from '../shared/types'

declare global {
  interface Window {
    owtion: OwtionApi
  }
}
