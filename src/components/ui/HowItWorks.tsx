'use client'

const STEPS = [
  {
    number: '1',
    title: 'Fon Seçin',
    description: 'Arama yaparak veya kategorilerden fonunuzu bulun.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Gerçek Getiriyi Görün',
    description: 'TL, USD, EUR ve altın bazında getiriyi karşılaştırın.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Kararınızı Verin',
    description: 'Veriye dayalı kararlar alın, gerçek performansı bilin.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  return (
    <section className="py-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-heading">Nasıl Çalışır?</h2>
        <p className="text-muted mt-1">3 adımda fonunuzun gerçek performansını öğrenin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className="relative bg-surface border border-border-default rounded-xl p-6 text-center group hover:shadow-md hover:border-border-strong transition"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mb-4">
              {step.icon}
            </div>
            <div className="absolute top-4 right-4 text-4xl font-bold text-surface-inset dark:text-surface-inset select-none">
              {step.number}
            </div>
            <h3 className="text-lg font-semibold text-heading mb-2">{step.title}</h3>
            <p className="text-muted text-sm">{step.description}</p>

            {/* Connection arrow (hidden on last step and mobile) */}
            {i < STEPS.length - 1 && (
              <svg
                className="hidden md:block absolute top-1/2 -right-5 -translate-y-1/2 text-subtle"
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M4 10h12m0 0-4-4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
