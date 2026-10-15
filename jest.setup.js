/* Mocks de módulos nativos para pruebas */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  const api = {
    getItem: jest.fn(async k => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => {
      store[k] = v;
    }),
    removeItem: jest.fn(async k => {
      delete store[k];
    }),
    multiGet: jest.fn(async keys => keys.map(k => [k, store[k] ?? null])),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
  return {__esModule: true, default: api, ...api};
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({didCancel: true})),
  launchImageLibrary: jest.fn(async () => ({didCancel: true})),
}));
