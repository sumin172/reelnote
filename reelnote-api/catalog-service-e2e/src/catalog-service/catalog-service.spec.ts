import axios from 'axios';

describe('GET /api/health', () => {
  it('should report service status', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/ok/i),
        service: 'catalog-service',
      }),
    );
  });
});
