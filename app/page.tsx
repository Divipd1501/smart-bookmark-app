'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

type Bookmark = {
  id: string
  title: string
  url: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadBookmarks(data.user)
      setLoading(false)
    })

    const channel = supabase
      .channel('realtime-bookmarks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks' },
        () => user && loadBookmarks(user)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function loadBookmarks(currentUser: any) {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    setBookmarks(data || [])
  }

  async function login() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function addBookmark() {
    if (!title || !url) return

    await supabase.from('bookmarks').insert({
      title,
      url,
      user_id: user.id,
    })

    setTitle('')
    setUrl('')
  }

  async function removeBookmark(id: string) {
    await supabase.from('bookmarks').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-200 to-purple-300">
        <button
          onClick={login}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg text-lg transition"
        >
          Login with Google 🚀
        </button>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen transition duration-300 ${
        darkMode
          ? 'bg-gray-900 text-white'
          : 'bg-gradient-to-br from-blue-100 to-purple-200'
      } flex items-center justify-center p-4`}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📌 My Bookmarks</h1>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="text-sm bg-gray-300 dark:bg-gray-600 px-3 py-1 rounded-lg"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={logout}
              className="text-sm text-red-400 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>

        <input
          placeholder="Bookmark title"
          className="border rounded-lg p-2 w-full text-black"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="https://example.com"
          className="border rounded-lg p-2 w-full text-black"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <button
          onClick={addBookmark}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg w-full transition"
        >
          Add Bookmark
        </button>

        {bookmarks.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No bookmarks yet. Add your first one 🚀
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((b) => (
              <div
                key={b.id}
                className="flex justify-between items-center p-3 rounded-lg bg-gray-100 hover:shadow-lg transition"
              >
                <a
                  href={b.url}
                  target="_blank"
                  className="text-blue-600 font-medium truncate"
                >
                  {b.title}
                </a>
                <button
                  onClick={() => removeBookmark(b.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
