import type { SauceResponse } from './types'
import { Sauce } from './types'

export * from './types'

const { SAUCE_KEY } = process.env
export async function getSauce(url: string): Promise<Sauce[]> {
  const search = `db=999&output_type=2&api_key=${SAUCE_KEY}&url=${url}`
  const res = await fetch(`https://saucenao.com/search.php?${search}`)

  const data = await res.json() as SauceResponse
  return data.results.map(result => new Sauce(result))
}
