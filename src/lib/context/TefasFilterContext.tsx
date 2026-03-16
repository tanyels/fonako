'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface TefasFilterContextValue {
  showOnlyTefas: boolean
  setShowOnlyTefas: (val: boolean) => void
}

const TefasFilterContext = createContext<TefasFilterContextValue>({
  showOnlyTefas: true,
  setShowOnlyTefas: () => {},
})

export function TefasFilterProvider({ children }: { children: ReactNode }) {
  const [showOnlyTefas, setShowOnlyTefas] = useState(true)

  return (
    <TefasFilterContext.Provider value={{ showOnlyTefas, setShowOnlyTefas }}>
      {children}
    </TefasFilterContext.Provider>
  )
}

export function useTefasFilter() {
  return useContext(TefasFilterContext)
}
