import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Delete completed tasks older than 30 days
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('is_completed', true)
      .lt('date_created', thirtyDaysAgo.toISOString());

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cleaning up tasks:', error);
    return NextResponse.json({ error: 'Failed to clean up tasks' }, { status: 500 });
  }
} 