import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadAuctionPDF } from '../utils/pdf';

// ── Helpers ───────────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem('dpl_auction')); } catch { return null; }
}

function save(state) {
  const { result: _, ...rest } = state;
  localStorage.setItem('dpl_auction', JSON.stringify({ ...rest, result: null }));
}

function resolvePlayer(prev) {
  const player = prev.players[prev.currentPlayerIndex];
  if (!player) return prev;

  if (prev.highestBidder) {
    const updatedTeams = prev.teams.map(t =>
      t.id === prev.highestBidder.id
        ? { ...t, points: t.points - prev.currentBid, players: [...t.players, { name: player.name, price: prev.currentBid }] }
        : t
    );
    return {
      ...prev, teams: updatedTeams, timerValue: 0, status: 'sold',
      soldPlayers: [...prev.soldPlayers, { player: player.name, team: prev.highestBidder.name, teamId: prev.highestBidder.id, price: prev.currentBid }],
      result: { type: 'sold', player: player.name, team: prev.highestBidder.name, price: prev.currentBid }
    };
  }
  return {
    ...prev, timerValue: 0, status: 'sold',
    unsoldPlayers: [...prev.unsoldPlayers, player.name],
    result: { type: 'unsold', player: player.name }
  };
}

// ── Timer display ─────────────────────────────────────────────────────────────

function Timer({ value, status }) {
  const red = value <= 3 && status === 'bidding';
  const orange = value > 3 && value <= 5 && status === 'bidding';
  const cls = red ? 'text-red-500 timer-glow-red' : orange ? 'text-yellow-400 timer-glow-orange' : 'text-green-400 timer-glow-green';
  return (
    <div className="text-center select-none">
      <div className={`text-[4.5rem] sm:text-[7rem] leading-none font-black tabular-nums ${cls} ${red ? 'animate-flash' : ''}`}>
        {String(value).padStart(2, '0')}
      </div>
      <p className="text-xs tracking-[0.3em] text-gray-500 mt-1">SECONDS</p>
    </div>
  );
}

// ── Sold / Unsold banner ──────────────────────────────────────────────────────

function Banner({ result, visible }) {
  if (!visible || !result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
      <div className="animate-sold-in text-center w-full max-w-sm sm:max-w-md">
        {result.type === 'sold' ? (
          <div className="bg-[#FFD700] text-black px-8 py-6 sm:px-14 sm:py-8 rounded-2xl sm:rounded-3xl shadow-2xl shadow-[#FFD700]/30">
            <p className="text-xs sm:text-sm font-black tracking-[0.5em] opacity-60 mb-1">SOLD!</p>
            <p className="text-3xl sm:text-5xl font-black leading-tight">{result.player}</p>
            <p className="text-lg sm:text-xl font-bold mt-2 opacity-80">{result.team}</p>
            <p className="text-3xl sm:text-4xl font-black mt-1">{result.price} PTS</p>
          </div>
        ) : (
          <div className="bg-gray-700 text-white px-8 py-6 sm:px-14 sm:py-8 rounded-2xl sm:rounded-3xl shadow-2xl">
            <p className="text-xs sm:text-sm font-black tracking-[0.5em] opacity-60 mb-1">UNSOLD</p>
            <p className="text-3xl sm:text-5xl font-black leading-tight">{result.player}</p>
            <p className="text-base sm:text-lg text-gray-400 mt-2">No bids placed</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, state, onBid, compact }) {
  const leading = state.highestBidder?.id === team.id;
  const nextBid = state.currentBid === 0 ? state.basePrice : state.currentBid + state.minIncrement;
  const canBid = ['ready', 'bidding'].includes(state.status) && !leading && team.points >= nextBid;
  const spent = state.budget - team.points;

  return (
    <div
      className="relative bg-[#0F0F28] rounded-2xl p-3 sm:p-4 border-2 transition-all duration-300"
      style={leading ? { borderColor: team.color, boxShadow: `0 0 18px ${team.color}44` } : { borderColor: '#1a1a3a' }}
    >
      {leading && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 rounded-full tracking-widest whitespace-nowrap"
          style={{ backgroundColor: team.color, color: '#000' }}>LEADING</div>
      )}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        <span className="font-black text-xs sm:text-sm truncate">{team.name}</span>
      </div>
      <div className="mb-2 sm:mb-2">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xl sm:text-2xl font-black" style={{ color: team.color }}>{team.points}</span>
          <span className="text-[10px] sm:text-xs text-gray-500">pts left</span>
        </div>
        <div className="h-1 rounded-full bg-gray-800">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (spent / state.budget) * 100)}%`, backgroundColor: team.color }} />
        </div>
        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{spent} spent</p>
      </div>
      {!compact && team.players.length > 0 && (
        <div className="mb-2 space-y-0.5 max-h-20 sm:max-h-24 overflow-y-auto">
          {team.players.map((p, i) => (
            <div key={i} className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-gray-400 truncate max-w-[70%]">{p.name}</span>
              <span className="font-bold" style={{ color: team.color }}>{p.price}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => canBid && onBid(team.id)} disabled={!canBid}
        className={`w-full py-3 rounded-xl text-xs sm:text-sm font-black tracking-wider transition-all ${canBid ? 'active:scale-95 cursor-pointer hover:brightness-110' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'}`}
        style={canBid ? { backgroundColor: team.color, color: '#000' } : {}}>
        {leading ? '★ LEADING' : !canBid && team.points < nextBid ? 'LOW FUNDS' : canBid ? `BID ${nextBid}` : 'WAIT'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Auction() {
  const navigate = useNavigate();
  const [state, setState] = useState(load);
  const [banner, setBanner] = useState({ visible: false, result: null });
  const timerRef = useRef(null);

  // Persist to localStorage on every state change
  useEffect(() => { if (state) save(state); }, [state]);

  // Restart timer (called after a bid or resume)
  const restartTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev || prev.status === 'paused') return prev;
        if (prev.status !== 'bidding') { clearInterval(timerRef.current); return prev; }
        const next = prev.timerValue - 1;
        if (next <= 0) { clearInterval(timerRef.current); return resolvePlayer({ ...prev, timerValue: 0 }); }
        return { ...prev, timerValue: next };
      });
    }, 1000);
  }, []);

  // Show banner + schedule next player when status becomes 'sold'
  const resolvedCount = (state?.soldPlayers?.length ?? 0) + (state?.unsoldPlayers?.length ?? 0);
  useEffect(() => {
    if (state?.status !== 'sold') return;
    setBanner({ visible: true, result: state.result });
    const hide = setTimeout(() => setBanner(b => ({ ...b, visible: false })), 2800);
    const next = setTimeout(() => {
      setState(prev => {
        if (!prev) return prev;
        const ni = prev.currentPlayerIndex + 1;
        if (ni >= prev.players.length) return { ...prev, status: 'ended', currentPlayerIndex: -1, result: null };
        return { ...prev, currentPlayerIndex: ni, currentBid: 0, highestBidder: null, timerValue: 0, status: 'ready', bidHistory: [], result: null };
      });
    }, 3200);
    return () => { clearTimeout(hide); clearTimeout(next); };
  }, [resolvedCount]); // eslint-disable-line

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const placeBid = (teamId) => {
    setState(prev => {
      if (!['ready', 'bidding'].includes(prev.status)) return prev;
      const team = prev.teams.find(t => t.id === teamId);
      if (!team || prev.highestBidder?.id === teamId) return prev;
      const amount = prev.currentBid === 0 ? prev.basePrice : prev.currentBid + prev.minIncrement;
      if (team.points < amount) return prev;
      return { ...prev, currentBid: amount, highestBidder: { id: team.id, name: team.name }, status: 'bidding', timerValue: 10, bidHistory: [{ team: team.name, amount, time: Date.now() }, ...prev.bidHistory].slice(0, 15) };
    });
    restartTimer();
  };

  const handleStart = () => {
    clearInterval(timerRef.current);
    setState(prev => ({ ...prev, status: 'ready', currentPlayerIndex: 0, currentBid: 0, highestBidder: null, timerValue: 0, bidHistory: [], result: null }));
  };

  const handlePause = () => { clearInterval(timerRef.current); setState(prev => ({ ...prev, status: 'paused' })); };

  const handleResume = () => {
    setState(prev => ({ ...prev, status: 'bidding' }));
    restartTimer();
  };

  const handleSkip = () => {
    clearInterval(timerRef.current);
    setState(prev => {
      const player = prev.players[prev.currentPlayerIndex];
      return { ...prev, status: 'sold', timerValue: 0, unsoldPlayers: [...prev.unsoldPlayers, player?.name], result: { type: 'unsold', player: player?.name } };
    });
  };

  const handleResetTimer = () => {
    setState(prev => ({ ...prev, timerValue: 10 }));
    if (state.status === 'bidding') restartTimer();
  };

  const handleEnd = () => { clearInterval(timerRef.current); setState(prev => ({ ...prev, status: 'ended' })); };

  const handleNewAuction = () => { localStorage.removeItem('dpl_auction'); navigate('/'); };

  // ── No auction configured ──────────────────────────────────────────────────

  if (!state || state.players?.length === 0) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-[#FFD700] gold-glow tracking-widest">DPL LEAGUE</h1>
          <p className="text-gray-500">No auction configured yet.</p>
          <button onClick={() => navigate('/')} className="px-8 py-3 border border-[#FFD700]/30 rounded-xl text-[#FFD700] hover:bg-[#FFD700]/10 transition">Go to Setup</button>
        </div>
      </div>
    );
  }

  // ── Ended / Results screen ─────────────────────────────────────────────────

  if (state.status === 'ended') {
    return (
      <div className="min-h-screen bg-[#07071A] text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl font-black text-[#FFD700] tracking-widest">DPL LEAGUE</h1>
            <p className="text-xs text-gray-500 tracking-widest">DOWNTOWN PREMIER LEAGUE</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-4 sm:mt-6">AUCTION COMPLETE</h2>
            <p className="text-gray-500 mt-1">{state.soldPlayers.length} sold · {state.unsoldPlayers.length} unsold</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
            {state.teams.map(team => (
              <div key={team.id} className="bg-[#0F0F28] rounded-2xl p-4 sm:p-5 border-2" style={{ borderColor: team.color + '55' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-black">{team.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-400">{state.budget - team.points} spent</span>
                  <span style={{ color: team.color }} className="font-bold">{team.points} remaining</span>
                </div>
                <div className="space-y-1">
                  {team.players.length === 0
                    ? <p className="text-xs text-gray-600">No players purchased</p>
                    : team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5 border-b border-gray-800">
                        <span className="text-gray-300">{p.name}</span>
                        <span className="font-bold" style={{ color: team.color }}>{p.price} pts</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {state.unsoldPlayers.length > 0 && (
            <div className="bg-[#0F0F28] rounded-2xl p-4 sm:p-5 border border-red-900/30 mb-5 sm:mb-6">
              <h3 className="text-sm font-bold text-red-400 tracking-widest mb-3">UNSOLD PLAYERS</h3>
              <div className="flex flex-wrap gap-2">
                {state.unsoldPlayers.map((p, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-red-900/20 text-red-400 border border-red-900/30">{p}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => downloadAuctionPDF(state)}
              className="flex-1 py-4 bg-[#FFD700] text-black font-black text-base sm:text-lg rounded-2xl hover:bg-[#FFC000] active:scale-[0.98] transition-all tracking-wider shadow-lg shadow-[#FFD700]/20">
              ↓ DOWNLOAD PDF RESULTS
            </button>
            <button onClick={handleNewAuction}
              className="sm:px-8 py-4 border border-gray-700 text-gray-300 font-bold rounded-2xl hover:bg-gray-800 transition">
              NEW AUCTION
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Live auction screen ────────────────────────────────────────────────────

  const currentPlayer = state.currentPlayerIndex >= 0 ? state.players[state.currentPlayerIndex] : null;
  const nextBid = state.currentBid === 0 ? state.basePrice : state.currentBid + state.minIncrement;

  return (
    <div className="min-h-screen bg-[#07071A] text-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#FFD700]/10 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-[0.2em] text-[#FFD700] gold-glow">DPL LEAGUE</h1>
          <p className="text-[9px] tracking-[0.3em] sm:tracking-[0.4em] text-gray-500 uppercase">Downtown Premier League</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {currentPlayer && <span className="text-gray-500 text-xs">{state.currentPlayerIndex + 1} / {state.players.length}</span>}
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            state.status === 'bidding' ? 'bg-green-900/30 text-green-400 border-green-800' :
            state.status === 'paused'  ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
            state.status === 'sold'    ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
            'bg-gray-800 text-gray-400 border-gray-700'}`}>
            {state.status}
          </span>
        </div>
      </header>

      {/* Body — mobile: flex-col (center first, then teams grid, then history)
               desktop: flex-row (teams | center | history) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">

        {/* Center stage — order 1 on mobile, order 2 on desktop */}
        <div className="order-1 lg:order-2 flex-1 flex flex-col items-center justify-center gap-3 lg:gap-4">

          {!currentPlayer ? (
            <div className="text-center space-y-5 sm:space-y-6 py-4">
              <div>
                <p className="text-xs tracking-widest text-[#FFD700]/50 mb-2">READY TO BEGIN</p>
                <p className="text-5xl sm:text-6xl font-black text-[#FFD700] gold-glow">{state.players.length}</p>
                <p className="text-gray-400 mt-1">{state.players.length === 1 ? 'player' : 'players'} · {state.teams.length} teams</p>
              </div>
              <button onClick={handleStart}
                className="px-10 sm:px-12 py-4 sm:py-5 bg-[#FFD700] text-black font-black text-xl sm:text-2xl rounded-2xl hover:bg-[#FFC000] active:scale-95 transition-all shadow-xl shadow-[#FFD700]/25 tracking-wider">
                START AUCTION
              </button>
            </div>
          ) : (
            <>
              {/* Current player */}
              <div className="w-full max-w-sm bg-[#0F0F28] rounded-2xl p-4 sm:p-6 border border-[#FFD700]/20 text-center card-gold-border">
                <p className="text-xs tracking-[0.4em] text-gray-500 uppercase mb-2 sm:mb-3">Now Auctioning</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">{currentPlayer.name}</h2>
                <p className="text-sm text-gray-500 mt-2 sm:mt-3">Base Price: <span className="text-[#FFD700] font-bold">{state.basePrice} pts</span></p>
              </div>

              {/* Bid stats */}
              <div className="flex gap-3 w-full max-w-sm">
                <div className="flex-1 bg-[#0F0F28] rounded-xl p-3 sm:p-4 border border-gray-800 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 tracking-widest mb-1">CURRENT BID</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#FFD700]">{state.currentBid > 0 ? state.currentBid : '—'}</p>
                </div>
                <div className="flex-1 bg-[#0F0F28] rounded-xl p-3 sm:p-4 border border-gray-800 text-center">
                  <p className="text-[10px] sm:text-xs text-gray-500 tracking-widest mb-1">HIGHEST BIDDER</p>
                  <p className="text-base sm:text-lg font-black text-white truncate">{state.highestBidder?.name || '—'}</p>
                </div>
              </div>

              {state.status === 'bidding' && <Timer value={state.timerValue} status={state.status} />}
              {state.status === 'ready'   && <p className="text-xs tracking-[0.4em] text-gray-600 animate-pulse">WAITING FOR FIRST BID</p>}
              {state.status === 'paused'  && <p className="text-yellow-400 text-sm font-bold tracking-[0.3em] animate-pulse">AUCTION PAUSED</p>}
              {state.status === 'sold'    && <p className="text-blue-400 text-sm font-bold tracking-[0.3em]">MOVING TO NEXT PLAYER...</p>}
            </>
          )}
        </div>

        {/* Teams — 2-col grid on mobile, vertical sidebar on desktop (order 2 mobile, order 1 desktop) */}
        <div className="order-2 lg:order-1 lg:w-56 lg:flex-shrink-0 lg:overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3">
            {state.teams.map(team => (
              <TeamCard key={team.id} team={team} state={state} onBid={placeBid} compact={true} />
            ))}
          </div>
        </div>

        {/* Bid history — compact strip on mobile, sidebar on desktop (order 3) */}
        <div className="order-3 lg:w-48 bg-[#0F0F28] rounded-2xl p-3 sm:p-4 border border-gray-800 overflow-y-auto flex-shrink-0 max-h-36 sm:max-h-44 lg:max-h-full">
          <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase mb-2 sm:mb-3">Bid History</p>
          {state.bidHistory.length === 0
            ? <p className="text-xs text-gray-700 text-center pt-3 lg:pt-6">No bids yet</p>
            : state.bidHistory.map((bid, i) => {
              const team = state.teams.find(t => t.name === bid.team);
              return (
                <div key={i} className={`flex justify-between items-center px-2 py-1.5 rounded-lg mb-1.5 ${i === 0 ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' : 'bg-gray-800/30'}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {team && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
                    <span className="text-xs text-gray-300 truncate">{bid.team}</span>
                  </div>
                  <span className={`text-xs font-black ml-2 flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : 'text-gray-500'}`}>{bid.amount}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Admin controls */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-t border-gray-800 flex items-center gap-2 flex-wrap bg-[#07071A]">
        <span className="text-[10px] text-gray-600 tracking-widest mr-1 uppercase">Admin</span>

        {state.status === 'configured' && (
          <button onClick={handleStart} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-green-900/40 hover:bg-green-800/60 text-green-400 border border-green-900 transition">START</button>
        )}
        {state.status === 'bidding' && (
          <button onClick={handlePause} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-400 border border-yellow-900 transition">PAUSE</button>
        )}
        {state.status === 'paused' && (
          <button onClick={handleResume} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-green-900/40 hover:bg-green-800/60 text-green-400 border border-green-900 transition">RESUME</button>
        )}
        {['ready', 'bidding', 'paused'].includes(state.status) && currentPlayer && (
          <>
            <button onClick={handleSkip} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-orange-900/40 hover:bg-orange-800/60 text-orange-400 border border-orange-900 transition">SKIP</button>
            <button onClick={handleResetTimer} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-900 transition">RESET TIMER</button>
          </>
        )}
        {!['configured', 'ended'].includes(state.status) && (
          <button onClick={handleEnd} className="px-4 py-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-900 transition ml-auto">END AUCTION</button>
        )}
      </div>

      <Banner result={banner.result} visible={banner.visible} />
    </div>
  );
}
