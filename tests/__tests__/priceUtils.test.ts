import { extractPriceFromDOM } from '../background/priceUtils';

(globalThis.chrome as any) = {
  tabs: {
    create: jest.fn(() => Promise.resolve({ id: 123 })),
    remove: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  },
  runtime: {
    lastError: null
  }
};

describe('extractPriceFromDOM', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
    chrome.scripting.executeScript.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.runtime.lastError = null;
  });

  test('extracts price from DOM correctly', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      cb([{ result: 19.99 }]);
    });

    const result = await extractPriceFromDOM('https://example.com', '.price');
    expect(result).toBe(19.99);
    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(chrome.tabs.remove).toHaveBeenCalledWith(123);
  });

  test('handles runtime error', async () => {
    chrome.runtime.lastError = { message: 'Blocked' };
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => cb([]));

    await expect(
      extractPriceFromDOM('https://example.com', '.bad')
    ).rejects.toEqual({ message: 'Blocked' });
  });
});
