import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

function LoginScreen({ error, onAuthenticated, onLoginError }) {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const looksPlaceholder = !googleClientId || googleClientId.includes('REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID');

  useEffect(() => {
    if (looksPlaceholder) return;
    const waitForGoogle = window.setInterval(() => {
      if (!window.google?.accounts?.id) return;
      window.clearInterval(waitForGoogle);
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          try {
            const { data } = await api.post('/auth/google', { credential });
            onAuthenticated(data.user);
            window.location.reload();
          } catch (err) {
            console.error(err);
            onLoginError?.(err.response?.data?.error || 'Google login failed');
          }
        }
      });
      window.google.accounts.id.renderButton(document.getElementById('google-signin'), { theme: 'outline', size: 'large', width: 280 });
    }, 200);
    return () => window.clearInterval(waitForGoogle);
  }, [googleClientId, onAuthenticated, looksPlaceholder]);

  return <div className="min-h-screen bg-gray-200 text-gray-900 flex items-center justify-center p-6"><div className="w-full max-w-xl rounded-3xl border border-gray-300/50 bg-white/5 p-10 shadow-2xl backdrop-blur"><p className="mb-3 text-sm uppercase tracking-[0.3em] text-gray-700">Chat Engine</p><h1 className="text-4xl font-semibold leading-tight">Google sign-in only.</h1><p className="mt-4 text-slate-300">Users enter with Google, then chat with an OpenClaw-powered assistant whose behavior is guided by SKILL.md.</p><div className="mt-8 flex flex-col gap-4"><div id="google-signin" className="min-h-[44px]" />{looksPlaceholder && <button onClick={async () => { const { data } = await api.get('/auth/me'); onAuthenticated(data.user); }} className="rounded-xl bg-gray-500 px-4 py-3 text-sm font-semibold text-gray-900">Continue in local dev mode</button>}{looksPlaceholder ? <p className="text-sm text-gray-700">Google OAuth is not configured yet, so local dev bypass is enabled.</p> : null}{error && <p className="text-sm text-gray-700">{error}</p>}</div></div></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);

  // Load Google script
  useEffect(() => { 
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Check for existing session on load
  useEffect(() => { 
    api.get('/auth/me').then(({ data }) => {
      setUser(data.user);
    }).catch(() => {}); 
  }, []);

  // Create NEW session on every login (no previous chat history)
  useEffect(() => {
    if (!user) return;
    
    async function initSession() {
      try {
        // Always create a fresh session - no loading previous chats
        const { data } = await api.post('/sessions', { title: 'Chat' });
        setSessionId(data._id);
        setMessages([]); // Start with empty messages
      } catch (err) {
        console.error('Failed to init session:', err);
      }
    }
    
    initSession();
  }, [user]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !sessionId || sending) return;
    
    const text = draft.trim();
    setDraft('');
    setSending(true);
    setError('');
    
    const temp = { _id: `temp-${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, temp]);
    
    try {
      const { data } = await api.post('/chat', { sessionId, message: text });
      setMessages((prev) => [...prev.filter((m) => m._id !== temp._id), data.userMessage, data.assistantMessage]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== temp._id));
      setDraft(text);
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed. Please upload a PDF resume.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const { data } = await api.post('/upload/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        setResumeUploaded(true);
        // Add system message about resume upload
        setMessages(prev => [...prev, {
          _id: `resume-${Date.now()}`,
          role: 'assistant',
          content: `✅ Resume uploaded successfully: ${file.name}`
        }]);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(event);
    }
  }

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    setSessionId(null);
    setMessages([]);
  }

  if (!user) return <LoginScreen error={error} onAuthenticated={(u) => { setUser(u); setError(''); }} />;
  
  return (
    <div className="flex h-screen bg-gray-200 text-gray-900">
      {/* Main chat area only - no sidebar */}
      <section className="flex h-full flex-1 flex-col">
        {/* Header with user info and logout */}
        <div className="flex items-center justify-between border-b border-gray-300 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chat Engine</h2>
            <p className="mt-1 text-sm text-slate-400">OpenClaw reads SKILL.md and powers the replies.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-700" />
            )}
            <button onClick={logout} className="ml-2 text-sm text-slate-400 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-400 p-6 text-sm text-slate-400 select-none">
                Start the conversation.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 select-none ${
                    message.role === 'user'
                      ? 'self-end bg-gray-500 text-gray-900'
                      : 'self-start border border-gray-300 bg-gray-100 text-slate-100'
                  }`}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ))
            )}
            {sending && (
              <div className="self-start rounded-2xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-slate-400">
                Thinking…
              </div>
            )}
          </div>
        </div>
        
        {/* Input area */}
        <form onSubmit={sendMessage} className="border-t border-gray-300 bg-gray-200/90 px-6 py-4">
          <div className="mx-auto flex max-w-4xl gap-3">
            {/* Resume upload button */}
            <div className="flex items-end">
              <label className={`flex items-center gap-2 rounded-2xl border border-gray-400 bg-gray-100 px-4 py-3 text-sm cursor-pointer hover:bg-gray-300 ${uploading ? 'opacity-50' : ''}`}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleResumeUpload}
                  disabled={uploading || resumeUploaded}
                  className="hidden"
                />
                <span className={resumeUploaded ? 'text-green-400' : 'text-slate-300'}>
                  {resumeUploaded ? '✅ Resume' : uploading ? '⏳ Uploading...' : '📎 Resume (PDF)'}
                </span>
              </label>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={3}
              placeholder="Message the chat engine…"
              className="min-h-[76px] flex-1 resize-none rounded-2xl border border-gray-400 bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-slate-500 focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={sending || !sessionId}
              className="rounded-2xl bg-gray-500 px-5 py-3 text-sm font-semibold text-gray-900 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          {error && <p className="mx-auto mt-3 max-w-4xl text-sm text-gray-700">{error}</p>}
        </form>
      </section>
    </div>
  );
}
