/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";
import { StationModel } from "@/models/Station";

// Mock formidable and its dependencies with explicit factories so require() in controller picks them up
vi.mock("formidable", () => ({
  default: vi.fn(),
}));
vi.mock("@/utils/s3Helper", () => ({
  s3Helper: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));
vi.mock("fs", () => ({
  default: {
    promises: {
      readFile: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

describe("Station Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Ensure fresh module graph so controller binds to the latest mocks
    vi.resetModules();
    // Setup Express mocks
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn().mockReturnThis();

    req = {
      body: {},
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    // Clear all collections before each test
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    }

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("Success Cases", () => {
    it("should create a new station with valid data", async () => {
      // Prime firstValues mock BEFORE importing the controller so it binds to the mocked fn
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "DZBB Radio",
          frequency: "594 AM",
          locationGroup: "luzon",
          slug: "dzbb-radio",
          status: "active",
        }),
      }));

      // Import controller AFTER mocks are set up
      const { createStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields arrays (as formidable would)
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["DZBB Radio"],
            frequency: ["594 AM"],
            locationGroup: ["luzon"],
            slug: ["dzbb-radio"],
            status: ["active"],
          },
          {}, // files object (empty for this test)
        ]),
      } as any);

      await createStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Station created successfully",
          data: expect.objectContaining({
            name: "DZBB Radio",
            frequency: "594 AM",
            locationGroup: "luzon",
            status: "active",
          }),
        })
      );

      // Verify station was saved to database
      const savedStation = await StationModel.findOne({ slug: "dzbb-radio" });
      expect(savedStation).toBeTruthy();
      expect(savedStation?.name).toBe("DZBB Radio");
    });

    it("should upload logo to S3 when file is provided", async () => {
      // Mock firstValues to return flattened strings
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "S3 Test Station",
          frequency: "88.1 FM",
          locationGroup: "luzon",
          slug: "s3-test-station",
          status: "active",
        }),
      }));

      // Import controller AFTER firstValues mock
      const { createStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields and a logoImage file
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["S3 Test Station"],
            frequency: ["88.1 FM"],
            locationGroup: ["luzon"],
            slug: ["s3-test-station"],
            status: ["active"],
          },
          {
            logoImage: {
              filepath: "/tmp/mock-logo.png",
              originalFilename: "logo.png",
              mimetype: "image/png",
              size: 4321,
            },
          },
        ]),
      } as any);

      // Mock fs.readFile/unlink
      const fsModule = await import("fs");
      // @ts-ignore types on mock
      vi.mocked(fsModule.default.promises.readFile).mockResolvedValue(Buffer.from("image-bytes"));
      // @ts-ignore types on mock
      vi.mocked(fsModule.default.promises.unlink).mockResolvedValue();

      // Mock S3 upload
      const s3Module = await import("@/utils/s3Helper");
      vi.mocked(s3Module.s3Helper.uploadFile).mockResolvedValue({
        key: "stations/logos/logo-123.png",
        bucket: "test-bucket",
        url: "https://cdn.example.com/stations/logos/logo-123.png",
        mimeType: "image/png",
        size: 4321,
      } as any);

      // Act
      await createStation(req as Request, res as Response);

      // Assert response
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Station created successfully",
        })
      );

      // Assert S3 upload was called correctly
      expect(s3Module.s3Helper.uploadFile).toHaveBeenCalledTimes(1);
      const [bufArg, filenameArg, optionsArg] = vi.mocked(s3Module.s3Helper.uploadFile).mock.calls[0];
      expect(Buffer.isBuffer(bufArg)).toBe(true);
      expect(filenameArg).toBe("logo.png");
      expect(optionsArg).toEqual(
        expect.objectContaining({
          folder: "stations/logos",
          quality: 80,
          maxWidth: 600,
          maxHeight: 600,
        })
      );

      // Assert temp file cleanup
      expect(fsModule.default.promises.unlink).toHaveBeenCalledWith("/tmp/mock-logo.png");
    });

    it("should update existing station", async () => {
      // Arrange: create an existing station in DB
      const existing = await StationModel.create({
        name: "DZBB Radio",
        slug: "dzbb-radio",
        frequency: "594 AM",
        locationGroup: "luzon",
        status: "active",
      });

      // Mock firstValues to return updated scalar fields
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "DZBB Updated",
          frequency: "600 AM",
        }),
      }));

      // Import controller AFTER firstValues mock
      const { updateStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return arrays (formidable-like)
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["DZBB Updated"],
            frequency: ["600 AM"],
          },
          {},
        ]),
      } as any);

      // Set req.params.id to the existing station id
      req.params = { id: existing._id.toString() };

      await updateStation(req as Request, res as Response);

      // Assert response
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Station updated successfully",
          data: expect.objectContaining({
              name: "DZBB Updated",
              frequency: "600 AM",
          }),
        })
      );

      // Verify DB was updated
      const reloaded = await StationModel.findById(existing._id);
      expect(reloaded?.name).toBe("DZBB Updated");
      expect(reloaded?.frequency).toBe("600 AM");
    });

    it("should delete existing station", async () => {
      // Arrange: create an existing station in DB
      const existing = await StationModel.create({
        name: "DZBB Radio",
        slug: "dzbb-radio",
        frequency: "594 AM",
        locationGroup: "luzon",
        status: "active",
      });

      const { deleteStation } = await import("@/controllers/stationsController");

      req.params = { id: existing._id.toString() };

      await deleteStation(req as Request, res as Response);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Station deleted successfully",
          data: expect.objectContaining({
              name: existing.name,
          }),
        })
      );

      //verify if data is not existing in DB
      const reload = await StationModel.findById(existing._id);

      expect(reload).toBeNull();
    });
  });

  describe("Validation Cases", () => {
    it("should not create stations with missing required fields", async () => {
      // Prime firstValues
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          frequency: "594 AM",
        }),
      }));

      // Import controller AFTER mocks are set up
      const { createStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields arrays (as formidable would)
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["DZBB Radio"],
            frequency: ["594 AM"],
            locationGroup: ["luzon"],
            slug: ["dzbb-radio"],
            status: ["active"],
          },
          {}, // files object (empty for this test)
        ]),
      } as any);

      await createStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Name, frequency, and location group are required",
        })
      );
    });

    it("should not create station with existing slug", async () => {
      // Arrange: create an existing station in DB
      await StationModel.create({
        name: "DZBB Radio",
        slug: "dzbb-radio",
        frequency: "594 AM",
        locationGroup: "luzon",
        status: "active",
      });

      // Prime firstValues
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "Another Station",
          frequency: "101.1 FM",
          locationGroup: "luzon",
          slug: "dzbb-radio", // duplicate slug
          status: "active",
        }),
      }));

      // Import controller AFTER mocks are set up
      const { createStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields arrays (as formidable would)
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["Another Station"],
            frequency: ["101.1 FM"],
            locationGroup: ["luzon"],
            slug: ["dzbb-radio"], // duplicate slug
            status: ["active"],
          },
          {}, // files object (empty for this test)
        ]),
      } as any);

      await createStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Station with this slug already exists",
        })
      );
    });

    it("should not update station to an existing slug", async () => {
      // Arrange: create two existing stations in DB
      const station1 = await StationModel.create({
        name: "DZBB Radio",
        slug: "dzbb-radio",
        frequency: "594 AM",
        locationGroup: "luzon",
        status: "active",
      });

      await StationModel.create({
        name: "Another Station",
        slug: "another-station",
        frequency: "101.1 FM",
        locationGroup: "luzon",
        status: "active",
      });

      // Prime firstValues
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          slug: "another-station", // duplicate slug
        }),
      }));

      // Import controller AFTER mocks are set up
      const { updateStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields arrays (as formidable would)
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            slug: ["another-station"], // duplicate slug
          },
          {}, // files object (empty for this test)
        ]),
      } as any);

      req.params = { id: station1._id.toString() };

      await updateStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Station with this slug already exists",
        })
      );
    });

    it("should not upload invalid logo file type when creating a station", async () => {
      // Prime firstValues to return valid scalars
      vi.doMock("@/utils/formidableFirstValues", () => ({
        firstValues: vi.fn().mockReturnValue({
          name: "Invalid Logo Station",
          frequency: "99.9 FM",
          locationGroup: "luzon",
          slug: "invalid-logo-station",
          status: "active",
        }),
      }));

      // Import controller AFTER firstValues mock
      const { createStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields and an invalid logoImage file
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {
            name: ["Invalid Logo Station"],
            frequency: ["99.9 FM"],
            locationGroup: ["luzon"],
            slug: ["invalid-logo-station"],
            status: ["active"],
          },
          {
            logoImage: {
              filepath: "/tmp/mock-logo.txt",
              originalFilename: "logo.txt",
              mimetype: "text/plain", // invalid type
              size: 1234,
            },
          },
        ]),
      } as any);

      await createStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Uploaded image is not a valid image type.",
        })
      );
    });

    it("should not upload invalid logo file type when updating a station", async () => {
      // Arrange: create an existing station in DB
      const existing = await StationModel.create({
        name: "Valid Logo Station",
        slug: "valid-logo-station",
        frequency: "100.1 FM",
        locationGroup: "luzon",
        status: "active",
      });

      // Import controller AFTER firstValues mock
      const { updateStation } = await import("@/controllers/stationsController");

      // Mock formidable.parse to return fields and an invalid logoImage file
      const mockFormidable = await import("formidable");
      vi.mocked(mockFormidable.default).mockReturnValue({
        parse: vi.fn().mockResolvedValue([
          {},
          {
            logoImage: {
              filepath: "/tmp/mock-logo.txt",
              originalFilename: "logo.txt",
              mimetype: "text/plain", // invalid type
              size: 1234,
            },
          },
        ]),
      } as any);

      req.params = { id: existing._id.toString() };

      await updateStation(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Uploaded image is not a valid image type.",
        })
      );
    });
  });
});
