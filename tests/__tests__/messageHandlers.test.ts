import { registerMessageHandlers } from '../background/messageHandlers';
import { extractPriceFromDOM } from '../background/priceUtils';

jest.mock('../background/priceUtils', () => ({
  extractPriceFromDOM: jest.fn()
}));

const mockAddListener = jest.fn();
(globalThis.chrome as any) = {
  runtime: { onMessage: { addListener: mockAddListener } }
};

describe('registerMessageHandlers', () => {
  const mockState = { token: null };

  beforeEach(() => {
    mockAddListener.mockClear();
    (extractPriceFromDOM as jest.Mock).mockClear();
  });

  test('registers chrome message listener', () => {
    registerMessageHandlers(mockState);
    expect(mockAddListener).toHaveBeenCalled();
  });

  test('handles extractPrice command', async () => {
    const handler = mockAddListener.mock.calls[0][0];

    const msg = { command: 'extractPrice', url: 'https://x.com', selector: '.price' };
    const sendResponse = jest.fn();
    (extractPriceFromDOM as jest.Mock).mockResolvedValueOnce('$19.99');

    const result = handler(msg, {}, sendResponse);
    expect(result).toBe(true);

    await Promise.resolve(); // flush microtask
    expect(sendResponse).toHaveBeenCalledWith({ price: '$19.99' });
  });

  test('handles extractPrice error', async () => {
    const handler = mockAddListener.mock.calls[0][0];

    const msg = { command: 'extractPrice', url: 'bad-url', selector: '.price' };
    const sendResponse = jest.fn();
    (extractPriceFromDOM as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    handler(msg, {}, sendResponse);
    await Promise.resolve();
    expect(sendResponse).toHaveBeenCalledWith({ error: 'fail' });
  });

  test('handles setToken command', () => {
    const handler = mockAddListener.mock.calls[0][0];
    const sendResponse = jest.fn();
    const msg = { command: 'setToken', token: 'abc123' };

    handler(msg, {}, sendResponse);
    expect(mockState.token).toBe('abc123');
    expect(sendResponse).toHaveBeenCalledWith({ status: 'ok' });
  });
});
