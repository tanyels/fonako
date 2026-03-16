'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <p className="text-body mb-4">Bir şeyler ters gitti.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-heading text-surface rounded-lg hover:opacity-90 transition text-sm font-medium"
          >
            Tekrar Dene
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
