const store = {
  sessions: [],
  messagesBySession: {}
};

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { store, makeId };
