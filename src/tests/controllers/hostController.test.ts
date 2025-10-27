/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, vi, expect, it } from "vitest";
import { Request, Response } from "express";
import { HostModel } from "@/models/Host";
import mongoose from "mongoose";

vi.mock("formidable", () => ({
  default: vi.fn(),
}));

describe("Host Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Setup Express mocks
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    req = {
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    // Clear all collection before each test
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }
  });
  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("Success Cases", () => {
    it("should create a host successfully", async () => {
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "Test Host",
          bio: "This is a test host",
          isActive: true,
        }),
      }));

      const { createHost } = await import("@/controllers/hostController");

      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["Test Host"],
            bio: ["this is a test host"],
            isActive: [true],
          },
          {},
        ]),
      } as any);

      // Call your createHost controller function here
      await createHost(req as Request, res as Response);

      // Add your assertions here
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Host created successfully",
          data: expect.objectContaining({
            name: "Test Host",
            bio: "This is a test host",
            isActive: true,
          }),
        })
      );

      // confirm database insertion
      const createdHost = await HostModel.findOne({ slug: "test-host" });
      expect(createdHost).not.toBeNull();
      expect(createdHost?.name).toBe("Test Host");
      expect(createdHost?.bio).toBe("This is a test host");
    });

    it("should get all hosts successfully", async () => {
      const hostData = {
        name: "Host One",
        slug: "host-one",
        bio: "Bio One",
        isActive: true,
      };
      await HostModel.create(hostData);
      
      const { getAllHosts } = await import("@/controllers/hostController");
      await getAllHosts(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Hosts retrieved successfully",
          data: expect.arrayContaining([
            expect.objectContaining({
              name: "Host One",
              bio: "Bio One",
            }),
          ]),
        })
      );
    });

    it("should get host by ID successfully", async () => {
      const hostData = {
        name: "Test Host",
        slug: "test-host",
        bio: "This is a test host fetched by ID",
        isActive: true,
      };
      const createdHost = await HostModel.create(hostData);

      req.params = { id: createdHost._id.toString() };

      // Call your getHostById controller function here
      const { getHostById } = await import("@/controllers/hostController");
      await getHostById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Host retrieved successfully",
          data: expect.objectContaining({
            name: hostData.name,
            bio: hostData.bio,
          }),
        })
      );
    });

    it("should get host by slug successfully", async () => {
      const hostData = {
        name: "Test Host",
        slug: "test-host",
        bio: "This is a test host fetched by ID",
        isActive: true,
      };
      const createdHost = await HostModel.create(hostData);

      req.params = { slug: createdHost.slug };

      // Call your getHostById controller function here
      const { getHostBySlug } = await import("@/controllers/hostController");
      await getHostBySlug(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Host retrieved successfully",
          data: expect.objectContaining({
            name: hostData.name,
            slug: hostData.slug,
            bio: hostData.bio,
          }),
        })
      );
    });
  });
});
