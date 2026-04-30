import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket';

function TimerDisplay({ value, status }) {
  const isRed = value <= 3 && status === 'bidding';
  const isOrange = value > 3 && value <= 5 && status === 'bidding';

  const colorClass = isRed
    ? 'text-red-500 timer-glow-red'
    : isOrange
    ? 'text-yellow-400 timer-glow-orange'
    : 'text-green-400 timer-glow-green';

  return (
    <div className="text-center select-none">
      <div
        className={`text-[7rem] leading-none font-black tabular-nums transition-colors duration-300 ${colorClass} ${isRed ? 'animate-pulse-fast' : ''}`}
      >
        {String(value).padStart(2, '0')}
      </div>
      <p className="text-xs tracking-[0.3em] text-gray-500 mt-1">SECONDS</p>
    </div>
  );
}

function TeamCard({ team, state, onBid }) {
  const isLeading = state.highestBidder?.id === team.id;
  const nextBid = state.currentBid === 0 ? state.basePrice : state.currentBid + state.minIncrement;
  const canBid =
    (state.status === 'ready' || state.status === 'bidding') &&
    !isLeading &&
    team.points >= nextBid;

  const spent = state.budget - team.points;
  const pctUsed = Math.min(100, (spent / state.budget) * 100);

  return (
    <div
      className={`relative bg-[#0F0F28] rounded-2xl p-4 border-2 transition-all duration-300 ${
        isLeading ? 'shadow-lg' : 'border-transparent'
      }`}
      style={isLeading ? { borderColor: team.color, boxShadow: `0 0 20px ${team.color}33` } : { borderColor: '#1a1a3a' }}
    >
      {isLeading && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-0.5 rounded-full tracking-widest"
          style={{ backgroundColor: team.color, color: '#000' }}
        >
          LEADING
        </div>
      )}

      {/* Team header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        <span className="font-black text-sm truncate">{team.name}</span>
      </div>

      {/* Budget */}
      <div className="mb-2">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-2xl font-black" style={{ color: team.color }}>{team.points}</span>
          <span className="text-xs text-gray-500">pts left</span>
        </div>
        <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pctUsed}%`, backgroundColor: team.color }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-0.5">{spent} spent</p>
      </div>

      {/* Players */}
      {team.players.length > 0 && (
        <div className="mb-3 space-y-0.5 max-h-24 overflow-y-auto">
          {team.players.map((p, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-400 truncate max-w-[80%]">{p.name}</span>
              <span className="font-bold" style={{ color: team.color }}>{p.price}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bid button */}
      <button
        onClick={() => canBid && onBid(team.id, nextBid)}
        disabled={!canBid}
        className={`w-full py-2.5 rounded-xl text-sm font-black tracking-wider transition-all duration-200 ${
          canBid
            ? 'active:scale-95 cursor-pointer hover:brightness-110'
            : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
        }`}
        style={canBid ? { backgroundColor: team.color, color: '#000' } : {}}
      >
        {isLeading
          ? '★ LEADING'
          : !canBid && team.points < nextBid
          ? 'LOW FUNDS'
          : canBid
          ? `BID  ${nextBid} PTS`
          : 'WAIT'}
      </button>
    </div>
  );
}

function SoldBanner({ result, visible }) {
  if (!visible || !result) return null;

  const isSold = result.type === 'sold';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-sold-in text-center">
        {isSold ? (
          <div className="bg-[#FFD700] text-black px-14 py-8 rounded-3xl shadow-2xl shadow-[#FFD700]/30">
            <p className="text-sm font-black tracking-[0.5em] opacity-60 mb-1">SOLD!</p>
            <p className="text-5xl font-black leading-tight">{result.player}</p>
            <p className="text-xl font-bold mt-2 opacity-80">{result.team}</p>
            <p className="text-4xl font-black mt-1">{result.price} PTS</p>
          </div>
        ) : (
          <div className="bg-gray-700 text-white px-14 py-8 rounded-3xl shadow-2xl">
            <p className="text-sm font-black tracking-[0.5em] opacity-60 mb-1">UNSOLD</p>
            <p className="text-5xl font-black leading-tight">{result.player}</p>
            <p className="text-lg text-gray-400 mt-2">No bids placed</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Auction() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerTimeout = useRef(null);

  useEffect(() => {
    socket.emit('state:request');

    socket.on('state:update', setState);

    socket.on('player:result', (res) => {
      setResult(res);
      setBannerVisible(true);
      clearTimeout(bannerTimeout.current);
      bannerTimeout.current = setTimeout(() => setBannerVisible(false), 2800);
    });

    return () => {
      socket.off('state:update');
      socket.off('player:result');
    };
  }, []);

  if (!state || state.players.length === 0) {
    return (
      <div className="min-h-screen bg-[#07071A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-[#FFD700] gold-glow tracking-widest">DPL LEAGUE</h1>
          <p className="text-gray-500">Auction not configured yet.</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 border border-[#FFD700]/30 rounded-xl text-[#FFD700] hover:bg-[#FFD700]/10 transition"
          >
            Go to Setup
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer =
    state.currentPlayerIndex >= 0 ? state.players[state.currentPlayerIndex] : null;
  const nextBid =
    state.currentBid === 0 ? state.basePrice : state.currentBid + state.minIncrement;

  const handleBid = (teamId, amount) => {
    socket.emit('bid:place', { teamId, amount });
  };

  // ── Ended screen ───────────────────────────────────────────────────────────
  if (state.status === 'ended') {
    return (
      <div className="min-h-screen bg-[#07071A] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-[#FFD700] tracking-widest">DPL LEAGUE</h1>
            <p className="text-xs text-gray-500 tracking-widest">DOWNTOWN PREMIER LEAGUE</p>
            <h2 className="text-4xl font-black mt-6">AUCTION COMPLETE</h2>
            <p className="text-gray-500 mt-1">
              {state.soldPlayers.length} sold · {state.unsoldPlayers.length} unsold
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {state.teams.map(team => (
              <div
                key={team.id}
                className="bg-[#0F0F28] rounded-2xl p-5 border-2"
                style={{ borderColor: team.color + '55' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-black">{team.name}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-400">{state.budget - team.points} spent</span>
                  <span style={{ color: team.color }} className="font-bold">{team.points} remaining</span>
                </div>
                <div className="space-y-1">
                  {team.players.length === 0 ? (
                    <p className="text-xs text-gray-600">No players purchased</p>
                  ) : (
                    team.players.map((p, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5 border-b border-gray-800">
                        <span className="text-gray-300">{p.name}</span>
                        <span className="font-bold" style={{ color: team.color }}>{p.price} pts</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {state.unsoldPlayers.length > 0 && (
            <div className="bg-[#0F0F28] rounded-2xl p-5 border border-red-900/30 mb-6">
              <h3 className="text-sm font-bold text-red-400 tracking-widest mb-3">UNSOLD PLAYERS</h3>
              <div className="flex flex-wrap gap-2">
                {state.unsoldPlayers.map((p, i) => (
                  <span key={i} className="text-xs px-3 py-1 rounded-full bg-red-900/20 text-red-400 border border-red-900/30">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 bg-[#FFD700] text-black font-black text-lg rounded-2xl hover:bg-[#FFC000] transition tracking-wider"
          >
            NEW AUCTION
          </button>
        </div>
      </div>
    );
  }

  // ── Main Auction Screen ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#07071A] text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#FFD700]/10 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-[0.2em] text-[#FFD700] gold-glow">DPL LEAGUE</h1>
          <p className="text-[9px] tracking-[0.4em] text-gray-500 uppercase">Downtown Premier League</p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {currentPlayer && (
            <span className="text-gray-500 text-xs">
              {state.currentPlayerIndex + 1} / {state.players.length}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              state.status === 'bidding'
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : state.status === 'paused'
                ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                : state.status === 'sold'
                ? 'bg-blue-900/30 text-blue-400 border-blue-800'
                : 'bg-gray-800 text-gray-400 border-gray-700'
            }`}
          >
            {state.status}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">

        {/* Left: Team Cards */}
        <div className="flex flex-row lg:flex-col gap-3 lg:w-56 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden pb-2 lg:pb-0 flex-shrink-0">
          {state.teams.map(team => (
            <div key={team.id} className="flex-shrink-0 lg:flex-shrink w-52 lg:w-full">
              <TeamCard team={team} state={state} onBid={handleBid} />
            </div>
          ))}
        </div>

        {/* Center: Auction Stage */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">

          {!currentPlayer ? (
            /* Pre-start */
            <div className="text-center space-y-6">
              <div>
                <p className="text-xs tracking-widest text-[#FFD700]/50 mb-2">READY TO BEGIN</p>
                <p className="text-6xl font-black text-[#FFD700] gold-glow">{state.players.length}</p>
                <p className="text-gray-400 mt-1">{state.players.length === 1 ? 'player' : 'players'} · {state.teams.length} teams</p>
              </div>
              <button
                onClick={() => socket.emit('admin:start')}
                className="px-12 py-5 bg-[#FFD700] text-black font-black text-2xl rounded-2xl hover:bg-[#FFC000] active:scale-95 transition-all shadow-xl shadow-[#FFD700]/25 tracking-wider"
              >
                START AUCTION
              </button>
            </div>
          ) : (
            <>
              {/* Player Card */}
              <div className="w-full max-w-sm bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/20 text-center card-gold-border">
                <p className="text-xs tracking-[0.4em] text-gray-500 uppercase mb-3">Now Auctioning</p>
                <h2 className="text-4xl font-black text-white leading-tight">{currentPlayer.name}</h2>
                <p className="text-sm text-gray-500 mt-3">
                  Base Price:{' '}
                  <span className="text-[#FFD700] font-bold">{state.basePrice} pts</span>
                </p>
              </div>

              {/* Bid Stats */}
              <div className="flex gap-4 w-full max-w-sm">
                <div className="flex-1 bg-[#0F0F28] rounded-xl p-4 border border-gray-800 text-center">
                  <p className="text-xs text-gray-500 tracking-widest mb-1">CURRENT BID</p>
                  <p className="text-3xl font-black text-[#FFD700]">
                    {state.currentBid > 0 ? state.currentBid : '—'}
                  </p>
                </div>
                <div className="flex-1 bg-[#0F0F28] rounded-xl p-4 border border-gray-800 text-center">
                  <p className="text-xs text-gray-500 tracking-widest mb-1">HIGHEST BIDDER</p>
                  <p className="text-lg font-black text-white truncate">
                    {state.highestBidder?.name || '—'}
                  </p>
                </div>
              </div>

              {/* Timer */}
              {state.status === 'bidding' && (
                <TimerDisplay value={state.timerValue} status={state.status} />
              )}

              {state.status === 'ready' && (
                <div className="text-center mt-2">
                  <p className="text-xs tracking-[0.4em] text-gray-600 animate-pulse">
                    WAITING FOR FIRST BID
                  </p>
                </div>
              )}

              {state.status === 'paused' && (
                <p className="text-yellow-400 text-sm font-bold tracking-[0.3em] animate-pulse">
                  AUCTION PAUSED
                </p>
              )}

              {state.status === 'sold' && (
                <p className="text-blue-400 text-sm font-bold tracking-[0.3em]">
                  MOVING TO NEXT PLAYER...
                </p>
              )}
            </>
          )}
        </div>

        {/* Right: Bid Feed */}
        <div className="lg:w-48 bg-[#0F0F28] rounded-2xl p-4 border border-gray-800 max-h-48 lg:max-h-full overflow-y-auto flex-shrink-0">
          <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase mb-3">Bid History</p>
          {state.bidHistory.length === 0 ? (
            <p className="text-xs text-gray-700 text-center pt-6">No bids yet</p>
          ) : (
            <div className="space-y-2">
              {state.bidHistory.map((bid, i) => {
                const team = state.teams.find(t => t.name === bid.team);
                return (
                  <div
                    key={i}
                    className={`flex justify-between items-center px-2 py-1.5 rounded-lg ${
                      i === 0 ? 'bg-[#FFD700]/10 border border-[#FFD700]/20' : 'bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {team && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                      )}
                      <span className="text-xs text-gray-300 truncate">{bid.team}</span>
                    </div>
                    <span
                      className={`text-xs font-black ml-2 flex-shrink-0 ${
                        i === 0 ? 'text-[#FFD700]' : 'text-gray-500'
                      }`}
                    >
                      {bid.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Admin Controls ── */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800/80 flex items-center gap-2 flex-wrap bg-[#07071A]">
        <span className="text-[10px] text-gray-600 tracking-widest mr-1 uppercase">Admin</span>

        {(state.status === 'ready' || state.status === 'setup') && state.currentPlayerIndex < 0 && (
          <button
            onClick={() => socket.emit('admin:start')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-green-900/40 hover:bg-green-800/60 text-green-400 border border-green-900 transition"
          >
            START
          </button>
        )}

        {state.status === 'bidding' && (
          <button
            onClick={() => socket.emit('admin:pause')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-400 border border-yellow-900 transition"
          >
            PAUSE
          </button>
        )}

        {state.status === 'paused' && (
          <button
            onClick={() => socket.emit('admin:resume')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-green-900/40 hover:bg-green-800/60 text-green-400 border border-green-900 transition"
          >
            RESUME
          </button>
        )}

        {['ready', 'bidding', 'paused'].includes(state.status) && currentPlayer && (
          <>
            <button
              onClick={() => socket.emit('admin:skip')}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-900/40 hover:bg-orange-800/60 text-orange-400 border border-orange-900 transition"
            >
              SKIP PLAYER
            </button>
            <button
              onClick={() => socket.emit('admin:reset_timer')}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-900 transition"
            >
              RESET TIMER
            </button>
          </>
        )}

        {state.status !== 'setup' && state.status !== 'ended' && (
          <button
            onClick={() => socket.emit('admin:end')}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-900 transition ml-auto"
          >
            END AUCTION
          </button>
        )}
      </div>

      {/* ── Sold / Unsold Banner ── */}
      <SoldBanner result={result} visible={bannerVisible} />
    </div>
  );
}
