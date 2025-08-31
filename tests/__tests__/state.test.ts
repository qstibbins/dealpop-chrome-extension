import { State } from '../../src/background/state';

(globalThis.chrome as any) = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({ token: 'stored-token' })),
      set: jest.fn()
    }
  }
};

describe('State', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test('loads token from storage on initialization', () => {
    new State();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['token'], expect.any(Function));
  });

  test('saves token to storage', () => {
    const state = new State();
    state.token = 'new-token';
    state.save();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ token: 'new-token' });
  });
});
