// Edge Function: generate-assignments
// Triggered by pg_cron daily at 00:05 UTC (07:05 Vietnam)
// Reads active schedules → creates quiz assignments for target users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FREQUENCY_MAP: Record<string, string> = {
  monthly: '1 month',
  quarterly: '3 months',
  biannual: '6 months',
  annual: '1 year',
}

Deno.serve(async (req) => {
  try {
    const now = new Date().toISOString()

    // 1. Get active schedules due for execution
    const { data: schedules, error: schErr } = await supabase
      .from('Testing_quiz_schedules')
      .select('*')
      .eq('active', true)
      .lte('next_run_at', now)

    if (schErr) throw schErr
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ message: 'No schedules due', count: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let totalAssignments = 0

    for (const schedule of schedules) {
      // 2. Get target users
      let targetUsers: { id: string; email: string }[] = []

      if (schedule.target_user_ids && schedule.target_user_ids.length > 0) {
        // Specific users
        const { data } = await supabase
          .from('Testing_users')
          .select('id, email')
          .in('id', schedule.target_user_ids)
        targetUsers = data || []
      } else {
        // By role
        let query = supabase.from('Testing_users').select('id, email')
        if (schedule.target_role === 'user') {
          query = query.eq('role', 'user')
        } else if (schedule.target_role === 'manager') {
          query = query.eq('role', 'manager')
        } else {
          // 'all' = user + manager (exclude admin)
          query = query.in('role', ['user', 'manager'])
        }
        const { data } = await query
        targetUsers = data || []
      }

      // 3. Create assignments for each user
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + schedule.deadline_days)

      const assignments = targetUsers.map((user) => ({
        quiz_id: schedule.quiz_id,
        user_id: user.id,
        assigned_by: schedule.created_by,
        deadline: deadlineDate.toISOString(),
        status: 'pending',
      }))

      if (assignments.length > 0) {
        // Use upsert-like logic: skip if active assignment already exists
        for (const assignment of assignments) {
          const { data: existing } = await supabase
            .from('Testing_quiz_assignments')
            .select('id')
            .eq('user_id', assignment.user_id)
            .eq('quiz_id', assignment.quiz_id)
            .in('status', ['pending', 'in_progress'])
            .limit(1)

          if (!existing || existing.length === 0) {
            await supabase.from('Testing_quiz_assignments').insert(assignment)
            totalAssignments++
          }
        }
      }

      // 4. Update schedule: set next_run_at
      const interval = schedule.frequency === 'custom'
        ? `${schedule.interval_days} days`
        : FREQUENCY_MAP[schedule.frequency]

      await supabase.rpc('update_schedule_next_run', {
        p_schedule_id: schedule.id,
        p_interval: interval,
      })
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${totalAssignments} assignments from ${schedules.length} schedules`,
        schedules_processed: schedules.length,
        assignments_created: totalAssignments,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-assignments error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
