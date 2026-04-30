const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const TEAM_COLORS = [
  '#FF6B35', '#4ECDC4', '#A855F7', '#EC4899',
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444'
];

let timerInterval = null;

let state = {
  status: 'setup',
  players: [],
  teams: [],
  currentPlayerIndex: -1,
  currentBid: 0,
  basePrice: 50,
  minIncrement: 20,
  budget: 1000,
  highestBidder: null,
  timerValue: 0,
  bidHistory: [],
  soldPlayers: [],
  unsoldPlayers: []
};

function broadcastState() {
  io.emit('state:update', state);
}

function startTimer() {
  clearInterval(timerInterval);
  state.timerValue = 10;
  broadcastState();

  timerInterval = setInterval(() => {
    if (state.status === 'paused') return;

    state.timerValue = Math.max(0, state.timerValue - 1);
    broadcastState();

    if (state.timerValue === 0) {
      clearInterval(timerInterval);
      resolveCurrentPlayer();
    }
  }, 1000);
}

function resolveCurrentPlayer() {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return;

  if (state.highestBidder !== null) {
    const team = state.teams.find(t => t.id === state.highestBidder.id);
    if (team) {
      team.points -= state.currentBid;
      team.players.push({ name: player.name, price: state.currentBid });
    }

    state.soldPlayers.push({
      player: player.name,
      team: state.highestBidder.name,
      teamId: state.highestBidder.id,
      price: state.currentBid
    });

    state.status = 'sold';
    broadcastState();

    io.emit('player:result', {
      type: 'sold',
      player: player.name,
      team: state.highestBidder.name,
      price: state.currentBid
    });
  } else {
    state.unsoldPlayers.push(player.name);
    state.status = 'sold';
    broadcastState();

    io.emit('player:result', {
      type: 'unsold',
      player: player.name,
      team: null,
      price: 0
    });
  }

  setTimeout(() => moveToNextPlayer(), 3200);
}

function moveToNextPlayer() {
  const nextIndex = state.currentPlayerIndex + 1;

  if (nextIndex >= state.players.length) {
    state.status = 'ended';
    state.currentPlayerIndex = -1;
    broadcastState();
    return;
  }

  state.currentPlayerIndex = nextIndex;
  state.currentBid = 0;
  state.highestBidder = null;
  state.timerValue = 0;
  state.status = 'ready';
  state.bidHistory = [];
  broadcastState();
}

io.on('connection', (socket) => {
  console.log(`[DPL] Connected: ${socket.id}`);
  socket.emit('state:update', state);

  socket.on('state:request', () => {
    socket.emit('state:update', state);
  });

  socket.on('setup:init', ({ players, teams, budget, basePrice, minIncrement }) => {
    clearInterval(timerInterval);

    state = {
      status: 'configured',
      players: players.map((name, i) => ({ id: i, name })),
      teams: teams.map((name, i) => ({
        id: i,
        name,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
        points: Number(budget) || 1000,
        players: []
      })),
      currentPlayerIndex: -1,
      currentBid: 0,
      basePrice: Number(basePrice) || 50,
      minIncrement: Number(minIncrement) || 20,
      budget: Number(budget) || 1000,
      highestBidder: null,
      timerValue: 0,
      bidHistory: [],
      soldPlayers: [],
      unsoldPlayers: []
    };

    broadcastState();
  });

  socket.on('admin:start', () => {
    if (state.players.length === 0) return;

    state.currentPlayerIndex = 0;
    state.currentBid = 0;
    state.highestBidder = null;
    state.timerValue = 0;
    state.status = 'ready';
    state.bidHistory = [];

    broadcastState();
  });

  socket.on('admin:pause', () => {
    if (state.status === 'bidding') {
      state.status = 'paused';
      broadcastState();
    }
  });

  socket.on('admin:resume', () => {
    if (state.status === 'paused' && state.timerValue > 0) {
      state.status = 'bidding';
      startTimer();
    }
  });

  socket.on('admin:skip', () => {
    if (state.currentPlayerIndex < 0) return;
    clearInterval(timerInterval);

    const player = state.players[state.currentPlayerIndex];
    state.unsoldPlayers.push(player?.name);
    state.status = 'sold';
    broadcastState();

    io.emit('player:result', {
      type: 'unsold',
      player: player?.name,
      team: null,
      price: 0
    });

    setTimeout(() => moveToNextPlayer(), 2200);
  });

  socket.on('admin:reset_timer', () => {
    if (state.status === 'bidding' || state.status === 'paused') {
      if (state.highestBidder) startTimer();
    }
  });

  socket.on('admin:end', () => {
    clearInterval(timerInterval);
    state.status = 'ended';
    broadcastState();
  });

  socket.on('bid:place', ({ teamId, amount }) => {
    if (state.status !== 'ready' && state.status !== 'bidding') return;

    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;
    if (state.highestBidder?.id === teamId) return;

    const minBid = state.currentBid === 0
      ? state.basePrice
      : state.currentBid + state.minIncrement;

    if (amount < minBid) return;
    if (team.points < amount) return;

    state.currentBid = amount;
    state.highestBidder = { id: team.id, name: team.name };
    state.status = 'bidding';

    state.bidHistory.unshift({ team: team.name, amount, time: Date.now() });
    if (state.bidHistory.length > 15) state.bidHistory.pop();

    startTimer();
    broadcastState();
  });

  socket.on('disconnect', () => {
    console.log(`[DPL] Disconnected: ${socket.id}`);
  });
});

app.get('/health', (req, res) => res.json({ ok: true, status: state.status }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  DPL League Auction Server\n  → http://localhost:${PORT}\n`);
});
