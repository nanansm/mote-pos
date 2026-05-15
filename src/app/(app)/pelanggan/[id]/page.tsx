import { PelangganDetail } from './pelanggan-detail'

export const dynamic = 'force-dynamic'

export default async function PelangganDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PelangganDetail id={id} />
}
