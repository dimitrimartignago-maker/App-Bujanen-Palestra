import { SupabaseClient } from '@supabase/supabase-js'

export interface Bulletin {
  id: string
  trainer_id: string
  client_id: string | null
  title: string
  body: string
  created_at: string
  read: boolean // populated client-side
}

export interface BulletinWithClient extends Bulletin {
  clientEmail: string | null // null = global
}

// ============================================================
// Trainer
// ============================================================

export async function getTrainerBulletins(
  supabase: SupabaseClient,
  trainerId: string
): Promise<BulletinWithClient[]> {
  const { data } = await supabase
    .from('bulletins')
    .select('id, trainer_id, client_id, title, body, created_at')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })

  if (!data) return []

  // Fetch emails for targeted bulletins
  const clientIds = [...new Set(data.filter((b) => b.client_id).map((b) => b.client_id as string))]
  let emailMap = new Map<string, string>()
  if (clientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', clientIds)
    emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email]))
  }

  return data.map((b) => ({
    ...b,
    read: false,
    clientEmail: b.client_id ? (emailMap.get(b.client_id) ?? null) : null,
  }))
}

export async function createBulletin(
  supabase: SupabaseClient,
  trainerId: string,
  title: string,
  body: string,
  clientId: string | null
): Promise<Bulletin | null> {
  const { data } = await supabase
    .from('bulletins')
    .insert({ trainer_id: trainerId, title: title.trim(), body: body.trim(), client_id: clientId })
    .select('id, trainer_id, client_id, title, body, created_at')
    .single()
  return data ? { ...data, read: false } : null
}

export async function deleteBulletin(supabase: SupabaseClient, bulletinId: string): Promise<void> {
  await supabase.from('bulletins').delete().eq('id', bulletinId)
}

// ============================================================
// Client
// ============================================================

export async function getClientBulletins(
  supabase: SupabaseClient,
  clientId: string
): Promise<Bulletin[]> {
  const { data: bulletins } = await supabase
    .from('bulletins')
    .select('id, trainer_id, client_id, title, body, created_at')
    .order('created_at', { ascending: false })

  if (!bulletins || bulletins.length === 0) return []

  const { data: reads } = await supabase
    .from('bulletin_reads')
    .select('bulletin_id')
    .eq('client_id', clientId)

  const readSet = new Set((reads ?? []).map((r) => r.bulletin_id))

  return bulletins.map((b) => ({
    ...b,
    read: readSet.has(b.id),
  }))
}

export async function countUnreadBulletins(
  supabase: SupabaseClient,
  clientId: string
): Promise<number> {
  const bulletins = await getClientBulletins(supabase, clientId)
  return bulletins.filter((b) => !b.read).length
}

export async function markBulletinRead(
  supabase: SupabaseClient,
  bulletinId: string,
  clientId: string
): Promise<void> {
  await supabase
    .from('bulletin_reads')
    .upsert({ bulletin_id: bulletinId, client_id: clientId }, { onConflict: 'bulletin_id,client_id' })
}

export async function markAllRead(
  supabase: SupabaseClient,
  bulletinIds: string[],
  clientId: string
): Promise<void> {
  if (bulletinIds.length === 0) return
  await supabase
    .from('bulletin_reads')
    .upsert(
      bulletinIds.map((id) => ({ bulletin_id: id, client_id: clientId })),
      { onConflict: 'bulletin_id,client_id' }
    )
}
