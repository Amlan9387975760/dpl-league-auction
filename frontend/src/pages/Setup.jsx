import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../services/socket';

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
  const [teamInputs, setTeamInputs] = useState(['Team Titans', 'Team Warriors', 'Team Kings']);
  const [budget, setBudget] = useState(1000);
  const [basePrice, setBasePrice] = useState(50);
  const [minIncrement, setMinIncrement] = useState(20);
  const [error, setError] = useState('');

  const addTeam = () => setTeamInputs([...teamInputs, '']);
  const removeTeam = (i) => setTeamInputs(teamInputs.filter((_, idx) => idx !== i));
  const updateTeam = (i, val) => {
    const updated = [...teamInputs];
    updated[i] = val;
    setTeamInputs(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const players = playerInput.split('\n').map(p => p.trim()).filter(Boolean);
    const teams = teamInputs.map(t => t.trim()).filter(Boolean);

    if (players.length === 0) return setError('Please add at least one player.');
    if (teams.length < 2) return setError('Please add at least two teams.');

    socket.emit('setup:init', { players, teams, budget, basePrice, minIncrement });
    navigate('/auction');
  };

  return (
    <div className="min-h-screen bg-[#07071A] text-white">
      {/* Header */}
      <div className="text-center pt-12 pb-8 border-b border-[#FFD700]/10">
        <p className="text-xs tracking-[0.5em] text-[#FFD700]/50 mb-2 uppercase">Welcome to</p>
        <h1 className="text-5xl font-black tracking-[0.15em] text-[#FFD700] gold-glow">DPL LEAGUE</h1>
        <p className="text-sm tracking-[0.4em] text-gray-400 mt-2">DOWNTOWN PREMIER LEAGUE</p>
        <p className="text-xs text-gray-600 mt-4">Configure your auction before starting</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Players */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-sm font-bold tracking-widest text-[#FFD700] mb-1 uppercase">Player List</h3>
          <p className="text-xs text-gray-500 mb-3">One player name per line</p>
          <textarea
            className="w-full bg-[#07071A] border border-gray-700 rounded-xl p-3 text-white text-sm resize-none focus:border-[#FFD700]/50 focus:outline-none transition placeholder-gray-600"
            rows={9}
            value={playerInput}
            onChange={e => setPlayerInput(e.target.value)}
            placeholder="Virat Kohli&#10;Rohit Sharma&#10;..."
          />
          <p className="text-xs text-gray-600 mt-1">
            {playerInput.split('\n').filter(p => p.trim()).length} players added
          </p>
        </div>

        {/* Teams */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-sm font-bold tracking-widest text-[#FFD700] mb-1 uppercase">Teams</h3>
          <p className="text-xs text-gray-500 mb-3">Minimum 2 teams required</p>
          <div className="space-y-2">
            {teamInputs.map((team, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  backgroundColor: ['#FF6B35','#4ECDC4','#A855F7','#EC4899','#3B82F6','#10B981','#F59E0B','#EF4444'][i % 8]
                }} />
                <input
                  className="flex-1 bg-[#07071A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition"
                  value={team}
                  onChange={e => updateTeam(i, e.target.value)}
                  placeholder={`Team ${i + 1}`}
                />
                {teamInputs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeTeam(i)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 text-sm transition"
                  >✕</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTeam}
              className="w-full py-2.5 mt-1 border border-dashed border-gray-600 hover:border-[#FFD700]/40 rounded-xl text-gray-500 hover:text-[#FFD700]/60 text-sm transition"
            >
              + Add Team
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-[#0F0F28] rounded-2xl p-6 border border-[#FFD700]/15">
          <h3 className="text-sm font-bold tracking-widest text-[#FFD700] mb-4 uppercase">Auction Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Budget / Team', value: budget, set: setBudget, hint: 'pts' },
              { label: 'Base Price', value: basePrice, set: setBasePrice, hint: 'pts' },
              { label: 'Min Increment', value: minIncrement, set: setMinIncrement, hint: 'pts' },
            ].map(({ label, value, set, hint }) => (
              <div key={label}>
                <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    className="w-full bg-[#07071A] border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition pr-8"
                    value={value}
                    onChange={e => set(Number(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded-xl border border-red-900/40">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-[#FFD700] text-black font-black text-lg rounded-2xl hover:bg-[#FFC000] active:scale-[0.98] transition-all tracking-wider shadow-lg shadow-[#FFD700]/20"
        >
          LAUNCH AUCTION →
        </button>
      </div>
    </div>
  );
}
