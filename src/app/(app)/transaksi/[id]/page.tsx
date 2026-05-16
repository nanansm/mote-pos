import { TransaksiDetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

export default async function TransaksiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TransaksiDetailClient id={id} />
}
