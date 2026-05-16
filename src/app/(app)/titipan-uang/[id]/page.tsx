import { TitipanUangDetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

export default async function TitipanUangDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TitipanUangDetailClient id={id} />
}
