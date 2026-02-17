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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadBookmarks()
    })

    const channel = supabase
      .channel('realtime-bookmarks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks' },
        loadBookmarks
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .order('created_at', { ascending: false })

    setBookmarks(data || [])
  }

  async function login() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
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

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <button
          onClick={login}
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Login with Google
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">My Bookmarks</h1>
        <button onClick={logout} className="text-red-500">Logout</button>
      </div>

      <input
        placeholder="Title"
        className="border p-2 w-full"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="URL"
        className="border p-2 w-full"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={addBookmark}
        className="bg-green-600 text-white p-2 w-full rounded"
      >
        Add Bookmark
      </button>

      {bookmarks.map((b) => (
        <div key={b.id} className="flex justify-between border p-2 rounded">
          <a href={b.url} target="_blank" className="text-blue-600">
            {b.title}
          </a>
          <button onClick={() => removeBookmark(b.id)}>❌</button>
        </div>
      ))}
    </div>
  )
}
