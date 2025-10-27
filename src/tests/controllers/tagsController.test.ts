import { describe, beforeEach, afterEach, vi, it, expect } from "vitest";
import { Request, Response } from "express";
import { createTag, deleteTag, updateTag } from "@/controllers/tagsController";
import { TagModel } from "@/models/Tag";

describe("Tags Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Success Cases", async () => {
    it("should create new tag successfully", async () => {
      // Test implementation goes here
      const tagData = {
        name: "Tag One",
      };

      req.body = tagData;

      // Call your createTag controller function here
      await createTag(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tag created successfully",
          data: expect.objectContaining({
            name: tagData.name,
            slug: "tag-one",
          }),
        })
      );
    });

    it("should update tag successfully", async () => {
      // Test implementation goes here
      const tagData = {
        name: "Tag One",
      };

      const createdTag = await TagModel.create(tagData);

      const updateValues = {
        name: "Tag One Updated",
      };
      req.body = updateValues;
      req.params = { id: createdTag._id.toString() };

      // Call your updateTag controller function here
      await updateTag(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tag updated successfully",
          data: expect.objectContaining({
            name: updateValues.name,
          }),
        })
      );

      //confirm in database
      const updatedTag = await TagModel.findById(createdTag._id);
      expect(updatedTag).not.toBeNull();
      expect(updatedTag!.name).toBe(updateValues.name);
    });

    // Create test for deleting tag successfully
    it("should delete tag successfully", async () => {
      // Test implementation goes here
      const tagData = {
        name: "Tag To Be Deleted",
      };

      const createdTag = await TagModel.create(tagData);

      req.params = { id: createdTag._id.toString() };

      // Call your deleteTag controller function here
      await deleteTag(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tag deleted successfully",
        })
      );

      // Confirm in database
      const deletedTag = await TagModel.findById(createdTag._id);
      expect(deletedTag).toBeNull();
    });

    // Create test for fetching tags successfully
    it("should fetch all tags successfully", async () => {
      // Test implementation goes here
      const tagsData = [{ name: "Tag One" }, { name: "Tag Two" }, { name: "Tag Three" }];

      await TagModel.insertMany(tagsData);

      // Call your getTags controller function here
      const { getAllTags } = await import("@/controllers/tagsController");
      await getAllTags(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tags fetched successfully",
          data: expect.arrayContaining([
            expect.objectContaining({ name: "Tag One" }),
            expect.objectContaining({ name: "Tag Two" }),
            expect.objectContaining({ name: "Tag Three" }),
          ]),
        })
      );
    });

    // Create test for fetching tag by ID successfully
    it("should fetch tag by ID successfully", async () => {
      // Test implementation goes here
      const tagData = {
        name: "Tag By ID",
      };
      const createdTag = await TagModel.create(tagData);

      req.params = { id: createdTag._id.toString() };

      // Call your getTagById controller function here
      const { getTagById } = await import("@/controllers/tagsController");
      await getTagById(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tag retrieved successfully",
          data: expect.objectContaining({
            name: tagData.name,
          }),
        })
      );
    });

    // Create test for fetching tag by slug successfully
    it("should fetch tag by slug successfully", async () => {
      // Test implementation goes here
      const tagData = {
        name: "Tag By Slug",
      };
      const createdTag = await TagModel.create(tagData);

      req.params = { slug: createdTag.slug };

      // Call your getTagBySlug controller function here
      const { getTagBySlug } = await import("@/controllers/tagsController");
      await getTagBySlug(req as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Tag retrieved successfully",
          data: expect.objectContaining({
            name: tagData.name,
          }),
        })
      );
    });
  });
});
