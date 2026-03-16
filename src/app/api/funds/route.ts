import { NextRequest, NextResponse } from 'next/server'
import { FUNDS } from '@/lib/data/funds'
import { extractTags, matchesAllTags } from '@/lib/utils/fundTags'
import { isBESFund } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  // Single lookup: ?code=TYH
  const code = sp.get('code')
  if (code) {
    const fund = FUNDS.find((f) => f.code === code)
    return fund
      ? NextResponse.json(fund)
      : NextResponse.json(null, { status: 404 })
  }

  // Batch lookup: ?codes=TYH,IPB
  const codes = sp.get('codes')
  if (codes) {
    const list = codes.split(',').filter(Boolean)
    const found = FUNDS.filter((f) => list.includes(f.code))
    return NextResponse.json(found)
  }

  // Random: ?random=true
  if (sp.get('random') === 'true') {
    const limit = Math.min(parseInt(sp.get('limit') || '1') || 1, 100)
    const shuffled = [...FUNDS].sort(() => Math.random() - 0.5)
    return NextResponse.json(shuffled.slice(0, limit))
  }

  // Tag filter: ?tags=Emeklilik,Hisse&exclude=TYH
  const tags = sp.get('tags')
  if (tags) {
    const tagList = tags.split(',').filter(Boolean)
    const exclude = sp.get('exclude') || ''
    const matched = FUNDS.filter(
      (f) => f.code !== exclude && matchesAllTags(f.name, tagList)
    )
    return NextResponse.json(matched)
  }

  // Search: ?q=altin&category=Hisse&besOnly=true&limit=50
  const q = sp.get('q')
  const category = sp.get('category')
  const besOnly = sp.get('besOnly') === 'true'
  const limit = Math.min(parseInt(sp.get('limit') || '50') || 50, 200)

  let results = FUNDS as typeof FUNDS

  if (category) {
    results = results.filter(
      (f) =>
        f.category === category ||
        f.name.toUpperCase().includes(category.toUpperCase())
    )
  }

  if (besOnly) {
    results = results.filter((f) => isBESFund(f.name, f.category))
  }

  if (q) {
    const upper = q.toUpperCase()
    results = results.filter(
      (f) =>
        f.code.toUpperCase().includes(upper) ||
        f.name.toUpperCase().includes(upper)
    )
  }

  return NextResponse.json(results.slice(0, limit))
}
