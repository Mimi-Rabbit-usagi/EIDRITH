import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Supabase Auth フック
 * user: ログイン中のユーザー情報（null = 未ログイン）
 * loading: セッション確認中
 */
export function useAuth() {
  const [user, setUser]       = useState(null);
  // Supabase 未設定なら確認すべきセッションが無いので、最初から loading=false でよい
  const [loading, setLoading] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;

    // 初回: 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // セッション変化（ログイン・ログアウト）を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return { user, loading, signInWithGoogle, signOut };
}
