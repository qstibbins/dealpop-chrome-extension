import { extractPriceFromDOM, extractPriceFromStructuredData, extractPrice } from '../../src/background/priceUtils';

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

describe('extractPriceFromStructuredData', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
    chrome.scripting.executeScript.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.runtime.lastError = null;
  });

  test('extracts price from Product schema with offers', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      cb([{ result: 29.99 }]);
    });

    const result = await extractPriceFromStructuredData('https://example.com');
    expect(result).toBe(29.99);
    expect(chrome.tabs.create).toHaveBeenCalled();
    expect(chrome.tabs.remove).toHaveBeenCalledWith(123);
  });

  test('returns null when no structured data found', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      cb([{ result: null }]);
    });

    const result = await extractPriceFromStructuredData('https://example.com');
    expect(result).toBeNull();
  });

  test('handles runtime error', async () => {
    chrome.runtime.lastError = { message: 'Blocked' };
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => cb([]));

    await expect(
      extractPriceFromStructuredData('https://example.com')
    ).rejects.toEqual({ message: 'Blocked' });
  });
});

describe('extractPrice (layered approach)', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
    chrome.scripting.executeScript.mockClear();
    chrome.tabs.remove.mockClear();
    chrome.runtime.lastError = null;
  });

  test('uses structured data when available', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      cb([{ result: 39.99 }]);
    });

    const result = await extractPrice('https://example.com', '.price');
    expect(result).toBe(39.99);
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1); // Only called once for structured data
  });

  test('falls back to DOM selector when structured data not found', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      // First call returns null (no structured data), second call returns DOM price
      const callCount = chrome.scripting.executeScript.mock.calls.length;
      cb([{ result: callCount === 1 ? null : 49.99 }]);
    });

    const result = await extractPrice('https://example.com', '.price');
    expect(result).toBe(49.99);
    expect(chrome.tabs.create).toHaveBeenCalledTimes(2); // Called twice: structured data + DOM
  });

  test('throws error when no structured data and no selector provided', async () => {
    chrome.scripting.executeScript.mockImplementation((_opts, cb) => {
      cb([{ result: null }]);
    });

    await expect(
      extractPrice('https://example.com')
    ).rejects.toThrow('No price found in structured data and no selector provided for DOM fallback');
  });
});
