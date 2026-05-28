import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TZ = 'America/Toronto';

// Convert a UTC ISO string to a local YYYY-MM-DD date string
function toLocalDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: TZ });
}

// Get today's local date string
function todayLocal() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// Build UTC midnight start for a local YYYY-MM-DD date
function localDateToUTCRange(localDate) {
  const start = new Date(`${localDate}T00:00:00`);
  // interpret as local time
  const startLocal = new Date(new Date(localDate + 'T00:00:00').toLocaleString('en-US', { timeZone: TZ }));
  // Just use noon UTC of that local date to avoid edge issues — store noon local time
  const d = new Date(localDate + 'T12:00:00');
  // Convert local noon to UTC
  const utcString = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return utcString.toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all completed workouts (service role sees all)
    const allWorkouts = await base44.asServiceRole.entities.Workout.filter(
      { status: 'completed' }, '-started_at', 2000
    );

    const restDays = allWorkouts.filter(w => w.name === 'Rest Day' || w.tags?.includes('rest'));
    const realWorkouts = allWorkouts.filter(w => w.name !== 'Rest Day' && !w.tags?.includes('rest'));

    // Build set of local dates that have real workouts
    const realWorkoutDates = new Set();
    for (const w of realWorkouts) {
      if (w.started_at) realWorkoutDates.add(toLocalDate(w.started_at));
    }

    // --- CLEANUP: remove rest days on workout days and duplicates ---
    const seenRestDates = new Set();
    const toDelete = [];

    // Sort oldest first so we keep earliest rest day per date
    const sortedRestDays = [...restDays].sort((a, b) =>
      new Date(a.started_at) - new Date(b.started_at)
    );

    for (const rd of sortedRestDays) {
      const localDate = rd.started_at ? toLocalDate(rd.started_at) : null;
      if (!localDate) { toDelete.push(rd.id); continue; }

      if (realWorkoutDates.has(localDate)) {
        toDelete.push(rd.id); continue;
      }
      if (seenRestDates.has(localDate)) {
        toDelete.push(rd.id); continue;
      }
      seenRestDates.add(localDate);
    }

    for (const id of toDelete) {
      await base44.asServiceRole.entities.Workout.delete(id);
    }

    // --- BACKFILL: create rest days from earliest account/workout date ---
    const today = todayLocal();
    let restDaysCreated = 0;

    // Start backfill from the earliest user account creation date — never before that
    const users = await base44.asServiceRole.entities.User.list();
    const backfillStart = users.reduce((earliest, u) => {
      const d = u.created_date ? toLocalDate(u.created_date) : today;
      return d < earliest ? d : earliest;
    }, today);

    // Iterate every day from backfillStart up to (but not including) today
    const startDate = new Date(backfillStart + 'T12:00:00.000-04:00');
    const endDate = new Date();

    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const localDate = d.toLocaleDateString('en-CA', { timeZone: TZ });

      if (localDate >= today) continue;
      if (realWorkoutDates.has(localDate) || seenRestDates.has(localDate)) continue;

      const noonUTC = new Date(`${localDate}T12:00:00.000-04:00`).toISOString();

      await base44.asServiceRole.entities.Workout.create({
        name: 'Rest Day',
        category: 'Custom',
        started_at: noonUTC,
        ended_at: noonUTC,
        duration_seconds: 0,
        status: 'completed',
        total_volume: 0,
        exercises: [],
        tags: ['rest'],
        notes: 'Automatically recorded rest day',
      });

      seenRestDates.add(localDate);
      restDaysCreated++;
    }

    return Response.json({ success: true, restDaysDeleted: toDelete.length, restDaysCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});