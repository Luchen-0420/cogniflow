import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 只有在配置有效时才创建客户端，否则返回 null
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey && 
    (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase 客户端创建失败:', error);
    supabaseClient = null;
  }
} else {
  console.warn('Supabase 配置无效，跳过客户端创建');
}

export const supabase = supabaseClient;
