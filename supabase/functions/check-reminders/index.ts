// Edge Function: check-reminders
// Triggered by pg_cron daily at 08:00 Vietnam (01:00 UTC)
// Checks pending assignments, sends reminder/deadline/overdue emails

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const checkType = body.check_type || 'all' // 'all', 'overdue', 'reminder'

    const now = new Date()
    let stats = { reminders: 0, deadlines: 0, overdues: 0, skipped: 0 }

    // 1. Get all pending/in_progress assignments with user + quiz info
    const { data: assignments, error } = await supabase
      .from('Testing_quiz_assignments')
      .select(`
        *,
        Testing_users ( id, email, display_name ),
        Testing_quizzes ( title )
      `)
      .in('status', ['pending', 'in_progress'])
      .not('deadline', 'is', null)

    if (error) throw error
    if (!assignments || assignments.length === 0) {
      return jsonResponse({ message: 'No pending assignments', stats })
    }

    for (const assignment of assignments) {
      const deadline = new Date(assignment.deadline)
      const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
      const user = assignment.Testing_users
      const quiz = assignment.Testing_quizzes

      if (!user || !quiz) continue

      // --- OVERDUE: deadline has passed ---
      if (hoursUntilDeadline < 0) {
        if (checkType === 'all' || checkType === 'overdue') {
          // Mark as overdue
          await supabase
            .from('Testing_quiz_assignments')
            .update({ status: 'overdue' })
            .eq('id', assignment.id)

          // Send overdue email (if not already sent)
          const alreadySent = await checkEmailSent(assignment.id, 'overdue', 48)
          if (!alreadySent) {
            await sendTemplateEmail(user, quiz, assignment, 'overdue')
            stats.overdues++
          } else {
            stats.skipped++
          }
        }
      }
      // --- DEADLINE WARNING: < 24 hours remaining ---
      else if (hoursUntilDeadline <= 24) {
        if (checkType === 'all' || checkType === 'reminder') {
          const alreadySent = await checkEmailSent(assignment.id, 'deadline', 24)
          if (!alreadySent) {
            await sendTemplateEmail(user, quiz, assignment, 'deadline')
            stats.deadlines++
          } else {
            stats.skipped++
          }
        }
      }
      // --- REMINDER: within remind_before_days ---
      else if (hoursUntilDeadline <= 72) {
        if (checkType === 'all' || checkType === 'reminder') {
          const alreadySent = await checkEmailSent(assignment.id, 'reminder', 48)
          if (!alreadySent) {
            await sendTemplateEmail(user, quiz, assignment, 'reminder')
            stats.reminders++
          } else {
            stats.skipped++
          }
        }
      }
    }

    return jsonResponse({ message: 'Reminder check complete', stats })
  } catch (error) {
    console.error('check-reminders error:', error)
    return jsonResponse({ error: error.message }, 500)
  }
})

// Check if an email of this type was already sent within N hours
async function checkEmailSent(
  assignmentId: string,
  emailType: string,
  withinHours: number
): Promise<boolean> {
  const since = new Date()
  since.setHours(since.getHours() - withinHours)

  const { data } = await supabase
    .from('Testing_email_logs')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('type', emailType)
    .eq('status', 'sent')
    .gte('created_at', since.toISOString())
    .limit(1)

  return (data && data.length > 0) || false
}

// Load template, replace variables, send email, log result
async function sendTemplateEmail(
  user: { id: string; email: string; display_name: string },
  quiz: { title: string },
  assignment: { id: string; quiz_id: string; deadline: string },
  emailType: string
) {
  // Load template
  const { data: template } = await supabase
    .from('Testing_email_templates')
    .select('*')
    .eq('type', emailType)
    .eq('active', true)
    .single()

  if (!template) {
    console.error(`No active template found for type: ${emailType}`)
    return
  }

  // Replace variables
  const deadlineFormatted = new Date(assignment.deadline).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  const subject = template.subject
    .replace(/\{\{user_name\}\}/g, user.display_name)
    .replace(/\{\{quiz_name\}\}/g, quiz.title)
    .replace(/\{\{deadline\}\}/g, deadlineFormatted)

  const content = template.content
    .replace(/\{\{user_name\}\}/g, user.display_name)
    .replace(/\{\{quiz_name\}\}/g, quiz.title)
    .replace(/\{\{deadline\}\}/g, deadlineFormatted)

  // Send via Resend
  let status = 'sent'
  let errorMessage = null

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'QuizMaster <noreply@yourdomain.com>',
        to: [user.email],
        subject,
        text: content,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Resend API error: ${res.status} ${errBody}`)
    }
  } catch (err) {
    status = 'failed'
    errorMessage = err.message
    console.error(`Failed to send ${emailType} email to ${user.email}:`, err)
  }

  // Log email
  await supabase.from('Testing_email_logs').insert({
    user_id: user.id,
    quiz_id: assignment.quiz_id,
    assignment_id: assignment.id,
    email: user.email,
    type: emailType,
    subject,
    status,
    error_message: errorMessage,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
