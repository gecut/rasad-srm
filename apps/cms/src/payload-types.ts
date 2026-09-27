import type { Config } from '@rasad/contracts'
export type * from '@rasad/contracts'
declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
