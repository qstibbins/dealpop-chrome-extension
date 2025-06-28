import { State } from '../background/state';

(globalThis.chrome as any) = {
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({ token: 'stored-token' })),
      set: jest.fn()
    }
  }
};

describe('State', () => {
  test('loads token from storage on construction', () => {
    const state = new State();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(['token'], expect.any(Function));
    // Simulate async behavior
    setTimeout(() => {
      expect(state.token).toBe('stored-token');
    }, 0);
  });

  test('save writes token to storage', () => {
    const state = new State();
    state.token = 'new-token';
    state.save();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ token: 'new-token' });
  });
});
