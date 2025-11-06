/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, vi, expect, it } from "vitest";
import { Request, Response } from "express";
import { JockModel } from "@/models/Jock";
import mongoose from "mongoose";

vi.mock("formidable", () => ({
  default: vi.fn(),
}));

describe("Jock Controller", () => {
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
    it("should create a jock successfully", async () => {
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "Test Jock",
          bio: "This is a test jock",
          isActive: true,
        }),
      }));

      const { createJock } = await import("@/controllers/jocksController");

      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["Test Jock"],
            bio: ["this is a test jock"],
            isActive: [true],
          },
          {},
        ]),
      } as any);

      // Call your createJock controller function here
      await createJock(req as Request, res as Response);

      // Add your assertions here
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Jock created successfully",
          data: expect.objectContaining({
            name: "Test Jock",
            bio: "This is a test jock",
            isActive: true,
          }),
        })
      );

      // confirm database insertion
      const createdJock = await JockModel.findOne({ slug: "test-jock" });
      expect(createdJock).not.toBeNull();
      expect(createdJock?.name).toBe("Test Jock");
      expect(createdJock?.bio).toBe("This is a test jock");
    });

    it("should get all jocks successfully", async () => {
      const jockData = {
        name: "Jock One",
        slug: "jock-one",
        bio: "Bio One",
        isActive: true,
      };
      await JockModel.create(jockData);
      
      const { getAllJocks } = await import("@/controllers/jocksController");
      await getAllJocks(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Jocks retrieved successfully",
          data: expect.arrayContaining([
            expect.objectContaining({
              name: "Jock One",
              bio: "Bio One",
            }),
          ]),
        })
      );
    });

    it("should get jock by ID successfully", async () => {
      const jockData = {
        name: "Test Jock",
        slug: "test-jock",
        bio: "This is a test jock fetched by ID",
        isActive: true,
      };
      const createdJock = await JockModel.create(jockData);

      req.params = { id: createdJock._id.toString() };

      // Call your getJockById controller function here
      const { getJockById } = await import("@/controllers/jocksController");
      await getJockById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Jock retrieved successfully",
          data: expect.objectContaining({
            name: jockData.name,
            bio: jockData.bio,
          }),
        })
      );
    });

    it("should get jock by slug successfully", async () => {
      const jockData = {
        name: "Test Jock",
        slug: "test-jock",
        bio: "This is a test jock fetched by ID",
        isActive: true,
      };
      const createdJock = await JockModel.create(jockData);

      req.params = { slug: createdJock.slug };

      // Call your getJockById controller function here
      const { getJockBySlug } = await import("@/controllers/jocksController");
      await getJockBySlug(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Jock retrieved successfully",
          data: expect.objectContaining({
            name: jockData.name,
            slug: jockData.slug,
            bio: jockData.bio,
          }),
        })
      );
    });
  });
});
