import { registerMessageHandlers } from '../../src/background/messageHandlers';

const mockAddListener = jest.fn();
(globalThis.chrome as any) = {
  runtime: { onMessage: { addListener: mockAddListener } }
};

describe('registerMessageHandlers', () => {
  beforeEach(() => {
    mockAddListener.mockClear();
  });

  test('registers message handler for extractPrice command', () => {
    const mockState = { token: null };
    registerMessageHandlers(mockState as any);
    
    expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
  });
});
