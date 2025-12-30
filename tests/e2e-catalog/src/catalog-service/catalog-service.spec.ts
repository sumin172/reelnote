import axios from "axios";

describe("Health Check Endpoints", () => {
  describe("GET /health/live", () => {
    it("should report liveness status", async () => {
      const response = await axios.get(`/health/live`);

      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          status: "UP",
          service: "catalog-service",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("GET /health/ready", () => {
    it("should report readiness status", async () => {
      const response = await axios.get(`/health/ready`);

      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          status: "UP",
          service: "catalog-service",
          timestamp: expect.any(String),
          checks: expect.objectContaining({
            database: "UP",
          }),
        }),
      );
    });
  });
});
