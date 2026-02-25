const pool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
  end: jest.fn(),
};

const queryWithRetry = jest.fn();
const initDatabase = jest.fn();

module.exports = { pool, queryWithRetry, initDatabase };
