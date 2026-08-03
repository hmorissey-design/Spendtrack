import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User 
} from '../firebase';
import { CloudDb } from '../utils/cloudDb';
import { X, LogIn, LogOut, Cloud, RefreshCw, CheckCircle2, User as UserIcon, ShieldCheck, Mail, Lock, UserPlus, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onDataSynced: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataSynced
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Email/Password state
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setStatusMessage('Connecting with Google...');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setStatusMessage('Syncing data with Firebase Cloud...');
        const downloaded = await CloudDb.downloadCloudDataToLocal(result.user.uid);
        if (!downloaded) {
          await CloudDb.uploadLocalDataToCloud(result.user.uid);
        }
        onDataSynced();
        setStatusMessage('Successfully signed in & synced!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
        setStatusMessage('Domain not authorized in Firebase Console yet. Add your domain under Firebase Auth -> Settings -> Authorized domains.');
      } else {
        setStatusMessage(`Sign in failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setStatusMessage(`Password reset link sent to ${email}. Check your inbox!`);
        setTimeout(() => setAuthMode('signin'), 3000);
        return;
      }

      let userCred;
      if (authMode === 'signup') {
        setStatusMessage('Creating your account...');
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        setStatusMessage('Signing in...');
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }

      if (userCred.user) {
        setStatusMessage('Syncing data with Firebase Cloud...');
        const downloaded = await CloudDb.downloadCloudDataToLocal(userCred.user.uid);
        if (!downloaded) {
          await CloudDb.uploadLocalDataToCloud(userCred.user.uid);
        }
        onDataSynced();
        setStatusMessage(authMode === 'signup' ? 'Account created & synced!' : 'Signed in & synced!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      if (error.code === 'auth/operation-not-allowed' || error.message?.includes('operation-not-allowed')) {
        setStatusMessage('Email/Password provider is disabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method and enable "Email/Password".');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setStatusMessage('Invalid email or password. Please try again or create an account.');
      } else if (error.code === 'auth/email-already-in-use') {
        setStatusMessage('An account with this email already exists. Try signing in instead.');
        setAuthMode('signin');
      } else if (error.code === 'auth/weak-password') {
        setStatusMessage('Password should be at least 6 characters long.');
      } else {
        setStatusMessage(`Error: ${error.message || 'Authentication failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setStatusMessage('Setting up Guest Cloud Sync...');
    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        await CloudDb.uploadLocalDataToCloud(result.user.uid);
        onDataSynced();
        setStatusMessage('Guest account active & synced!');
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (error: any) {
      console.error('Guest auth error:', error);
      if (error.code === 'auth/admin-restricted-operation' || error.message?.includes('admin-restricted-operation')) {
        setStatusMessage('Anonymous Auth is disabled in Firebase Console. Enable "Anonymous" under Sign-in providers in Firebase Console.');
      } else {
        setStatusMessage(`Guest sign-in failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setStatusMessage('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceUpload = async () => {
    if (!currentUser) return;
    setLoading(true);
    setStatusMessage('Uploading current local state to cloud...');
    try {
      await CloudDb.uploadLocalDataToCloud(currentUser.uid);
      setStatusMessage('Cloud backup updated!');
      onDataSynced();
    } catch (e: any) {
      setStatusMessage('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForceDownload = async () => {
    if (!currentUser) return;
    setLoading(true);
    setStatusMessage('Pulling cloud backup...');
    try {
      await CloudDb.downloadCloudDataToLocal(currentUser.uid);
      setStatusMessage('Local data updated from cloud!');
      onDataSynced();
    } catch (e: any) {
      setStatusMessage('Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Firebase Account & Cloud Sync</h2>
              <p className="text-[11px] text-gray-400 font-sans">Keep your budget data backed up across devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status indicator */}
        {statusMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="leading-relaxed">{statusMessage}</span>
          </div>
        )}

        {/* Current user card */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-white/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <UserIcon size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.displayName || (currentUser.isAnonymous ? 'Guest User' : currentUser.email || 'Authenticated User')}
                </p>
                <p className="text-[10px] text-gray-400 truncate font-mono">
                  {currentUser.email || `ID: ${currentUser.uid.substring(0, 12)}...`}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[9.5px] text-emerald-400 font-medium">
                  <ShieldCheck size={11} /> Cloud Auto-Sync Active
                </div>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleForceUpload}
                disabled={loading}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Cloud size={14} className="text-emerald-400" />
                Upload Local Data
              </button>
              <button
                onClick={handleForceDownload}
                disabled={loading}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={14} className="text-blue-400" />
                Pull Cloud Data
              </button>
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              Sign in to store and synchronize your budget, expenses, income streams, and savings goals securely in Firebase Cloud.
            </p>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Email / Password Toggle */}
            {!showEmailForm ? (
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Mail size={14} className="text-emerald-400" />
                Sign in or Register with Email
              </button>
            ) : (
              <div className="bg-[#181818] border border-white/10 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        authMode === 'signin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        authMode === 'signup' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="text-[10px] text-gray-500 hover:text-gray-300"
                  >
                    Hide
                  </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-2.5 text-gray-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#111111] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  {authMode !== 'forgot' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Password</label>
                        {authMode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => setAuthMode('forgot')}
                            className="text-[10px] text-emerald-400 hover:underline"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-2.5 text-gray-500" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#111111] border border-white/10 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer mt-1"
                  >
                    {authMode === 'signin' && <><LogIn size={13} /> Sign In</>}
                    {authMode === 'signup' && <><UserPlus size={13} /> Create Account</>}
                    {authMode === 'forgot' && <><KeyRound size={13} /> Send Password Reset Email</>}
                  </button>
                </form>
              </div>
            )}

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#121212] px-3 text-[10px] text-gray-500 uppercase font-mono tracking-wider">or</span>
            </div>

            <button
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogIn size={14} className="text-emerald-400" />
              Continue as Guest (Anonymous Cloud Sync)
            </button>
          </div>
        )}

        <div className="pt-2 text-center border-t border-white/5">
          <p className="text-[10px] text-gray-500">
            Powered by Google Cloud Firebase Firestore & Auth
          </p>
        </div>

      </div>
    </div>
  );
};

