import { createClient } from '@supabase/supabase-js';

// TODO: Move these to environment variables in a real app
const supabaseUrl = 'https://sfbzbvrlkyfleofosxan.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYnpidnJsa3lmbGVvZm9zeGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Nzk0MDMsImV4cCI6MjA4NjE1NTQwM30.yDb0ikAAJIEoMi-ltUL8Q3UQBw4g8az1MItO8K-XblQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
