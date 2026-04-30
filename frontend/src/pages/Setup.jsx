import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TEAM_COLORS = ['#FF6B35','#4ECDC4','#A855F7','#EC4899','#3B82F6','#10B981','#F59E0B','#EF4444'];

const DEFAULT_PLAYERS = `Virat Kohli
Rohit Sharma
MS Dhoni
Jasprit Bumrah
KL Rahul
Hardik Pandya
Ravindra Jadeja
Shubman Gill`;

export default function Setup() {
  const navigate = useNavigate();
  const [playerInput, setPlayerInput] = useState(DEFAULT_PLAYERS);
  const [teams, setTeams] = useState(['Team Titans', 'Team Warriors', 'Team Kings']);
  const [budget, setBudget] = useState(1000);
  const [basePrice, setBasePrice] = useState(50);
  const [minIncrement, setMinIncrement] = useState(20);
  const [error, setError] = useState('');

  const addTeam = () => setTeams([...teams, '']);
  const removeTeam = (i) => setTeams(teams.filter((_, idx) => idx !== i));
  const updateTeam = (i, val) => {
    const t = [...teams]; t[i] = val; setTeams(t);
  };

  const handleLaunch = () => {
    setError('');
    const players = playerInput.split('\n').map(p => p.trim()).filter(Boolean);
    const teamNames = teams.map(t => t.trim()).filter(Boolean);
    if (players.length === 0) return setError('Add at least one player.');
    if (teamNames.length < 2) return setError('Add at least two teams.');

    const initialState = {
      status: 'configured',
      players: players.map((name, i) => ({ id: i, name })),
      teams: teamNames.map((name, i) => ({
        id: i, name,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        points: Number(budget),
        players: []
      })),
      currentPlayerIndex: -1,
      currentBid: 0,
      basePrice: Number(basePrice),
      minIncrement: Number(minIncrement),
      budget: Number(budget),
      highestBidder: null,
      timerValue: 0,
      bidHistory: [],
      soldPlayers: [],
      unsoldPlayers: [],
      result: null
    };

    localStorage.setItem('dpl_auction', JSON.stringify(initialState));
    navigate('/auction');
  };

  return (
    <div className="min-h-screen bg-[#07071A] text-white">
      <div className="text-center pt-8 sm:pt-12 pb-6 sm:pb-8 border-b border-[#FFD700]/10">
        <p className="text-xs tracking-[0.5em] text-[#FFD700]/40 mb-2">WELCOME TO</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-[0.15em] text-[#FFD700] gold-glow">DPL LEAGUE</h1>
        <p className="text-sm tracking-[0.4em] text-gray-400 mt-2">DOWNTOWN PREMIER LEAGUE</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-4 sm:space-y-5">

        {/* Players */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-xs font-bold tracking-widest text-[#FFD700] uppercase mb-1">Player List</h3>
          <p className="text-xs text-gray-500 mb-3">One name per line</p>
          <textarea
            rows={9}
            className="w-full bg-[#07071A] border border-gray-700 rounded-xl p-3 text-white text-sm resize-none focus:border-[#FFD700]/50 focus:outline-none transition"
            value={playerInput}
            onChange={e => setPlayerInput(e.target.value)}
          />
          <p className="text-xs text-gray-600 mt-1">
            {playerInput.split('\n').filter(p => p.trim()).length} players
          </p>
        </div>

        {/* Teams */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-xs font-bold tracking-widest text-[#FFD700] uppercase mb-1">Teams</h3>
          <p className="text-xs text-gray-500 mb-3">Minimum 2 teams</p>
          <div className="space-y-2">
            {teams.map((team, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TEAM_COLORS[i % 8] }} />
                <input
                  className="flex-1 bg-[#07071A] border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#FFD700]/50 focus:outline-none transition"
                  value={team}
                  onChange={e => updateTeam(i, e.target.value)}
                  placeholder={`Team ${i + 1}`}
                />
                {teams.length > 2 && (
                  <button onClick={() => removeTeam(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs transition">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button onClick={addTeam}
              className="w-full py-2.5 mt-1 border border-dashed border-gray-700 hover:border-[#FFD700]/30 rounded-xl text-gray-500 hover:text-[#FFD700]/50 text-sm transition">
              + Add Team
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-xs font-bold tracking-widest text-[#FFD700] uppercase mb-4">Auction Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Budget / Team', val: budget, set: setBudget },
              { label: 'Base Price', val: basePrice, set: setBasePrice },
              { label: 'Min Increment', val: minIncrement, set: setMinIncrement },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0">
                <label className="text-xs text-gray-400 block sm:mb-1.5 w-28 sm:w-auto flex-shrink-0">{label}</label>
                <div className="relative flex-1 sm:flex-none">
                  <input type="number" min={1}
                    className="w-full bg-[#07071A] border border-gray-700 rounded-xl px-3 py-3 sm:py-2.5 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition pr-8"
                    value={val}
                    onChange={e => set(Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-xl border border-red-900/30">{error}</p>
        )}

        <button onClick={handleLaunch}
          className="w-full py-4 bg-[#FFD700] text-black font-black text-lg rounded-2xl hover:bg-[#FFC000] active:scale-[0.98] transition-all tracking-wider shadow-lg shadow-[#FFD700]/20">
          LAUNCH AUCTION →
        </button>
      </div>
    </div>
  );
}
