//TODOS: Make Featured Image required when status is Published
import { Request, Response } from "express";
import { Types } from "mongoose";
import { PostModel, PostStatus, PostType } from "@/models/Post";
import {
  CreatePostRequest,
  UpdatePostRequest,
  PostQueryParams,
  PostStatsQueryParams,
  RelatedPostsQueryParams,
  PostListResponse,
  PostStatsResponse,
} from "@/types/postTypes";
import fs from "fs";
import formidable from "formidable";
import { ObjectId, ObjectIdLike } from "bson";
import s3Helper from "@/utils/s3Helper";
import { MediaModel } from "@/models/Media";
const { firstValues } = require("formidable/src/helpers/firstValues.js");
import sanitize from "mongo-sanitize";

// GET /api/posts - Get all posts with advanced filtering and pagination
export const getPosts = async (
  req: Request<{}, PostListResponse, {}, PostQueryParams>,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      status,
      type,
      categories,
      author,
      tags,
      search,
      featured,
      sortBy = "publishedAt",
      sortOrder = "desc",
      startDate,
      endDate,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Status filter
    if (req.user) {
      // If the user is authenticated, show all posts or chosen status
      if (status) {
        filter.status = status;
      }
    } else {
      // For public requests, only show published posts
      filter.status = PostStatus.PUBLISHED;
      filter.publishedAt = { $lte: new Date() };
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Categories filter (renamed from category)
    if (categories) {
      const categoryIds = categories.split(",").map((cat: string) => new Types.ObjectId(cat.trim()));
      filter.categories = { $in: categoryIds };
    }

    // Author filter
    if (author) {
      filter.author = new Types.ObjectId(author);
    }

    // Tags filter
    if (tags) {
      const tagIds = tags.split(",").map((tag) => new Types.ObjectId(tag.trim()));
      filter.tags = { $in: tagIds };
    }

    // Featured filter
    if (featured !== undefined) {
      filter.isFeatured = featured === "true";
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ title: searchRegex }, { excerpt: searchRegex }, { content: searchRegex }];
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};

      if (startDate) {
        // Convert to Asia/Manila timezone and set to start of day
        const startDateTime = new Date(startDate);
        const manilaOffset = 8 * 60; // Manila is UTC+8
        const startOfDay = new Date(startDateTime.getTime() + manilaOffset * 60 * 1000);
        startOfDay.setUTCHours(0, 0, 0, 0); // Set to midnight in Manila time
        // Convert back to UTC for MongoDB
        dateFilter.$gte = new Date(startOfDay.getTime() - manilaOffset * 60 * 1000);
      }

      if (endDate) {
        // Convert to Asia/Manila timezone and set to end of day
        const endDateTime = new Date(endDate);
        const manilaOffset = 8 * 60; // Manila is UTC+8
        const endOfDay = new Date(endDateTime.getTime() + manilaOffset * 60 * 1000);
        endOfDay.setUTCHours(23, 59, 59, 999); // Set to end of day in Manila time
        // Convert back to UTC for MongoDB
        dateFilter.$lte = new Date(endOfDay.getTime() - manilaOffset * 60 * 1000);
      }

      // Allow date filter only for authenticated users
      if (req.user) {
        filter.publishedAt = dateFilter;
      } else {
        filter.publishedAt = { $lte: new Date() };
      }
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [posts, total] = await Promise.all([
      PostModel.find(filter)
        .lean()
        .select(
          "title slug excerpt author categories tags type status publishedAt thumbnailImage featuredImage isFeatured viewCount videoDuration readingTime"
        )
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate("author", "fullName email")
        .populate("categories", "name slug")
        .populate("tags", "name slug")
        .populate("thumbnailImage", "url key bucket mimeType")
        .populate("featuredImage", "url key bucket mimeType"),
      PostModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        status,
        categories: categories ? categories.split(",") : undefined,
        author,
        tags: tags ? tags.split(",") : undefined,
        search,
        featured: featured ? featured === "true" : undefined,

        dateRange:
          startDate || endDate
            ? {
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
              }
            : undefined,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Failed to fetch posts", error });
  }
};

// GET /api/posts/:id - Get a single post by ID or slug
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Try to find by ID first, then by slug
    let post;
    if (Types.ObjectId.isValid(id)) {
      post = await PostModel.findById(id);
    }

    if (!post) {
      post = await PostModel.findOne({ slug: id })
        .lean()
        .populate("author", "fullName email avatar")
        .populate("categories", "name slug description")
        .populate("tags", "name slug description")
        .populate("featuredImage", "url key bucket mimeType")
        .populate("thumbnailImage", "url key bucket mimeType");
    }

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    // If the post is not published, ensure the user is authenticated
    if (post.status !== PostStatus.PUBLISHED) {
      if (req.user == undefined) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Failed to fetch post", error });
  }
};

// POST /api/posts - Create a new post
export const createPost = async (req: Request<{}, {}, CreatePostRequest>, res: Response): Promise<void> => {
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);
    const formData = firstValues(form, fields, ["categories", "tags"]);

    const {
      title,
      slug,
      excerpt,
      content,
      author,
      categories = [],
      tags = [],
      type = PostType.BASIC_ARTICLE,
      featuredImageCaption,
      videoSourceUrl,
      videoDuration,
      status = PostStatus.DRAFT,
      isFeatured = false,
      metaTitle,
      metaDescription,
      // SEO fields
      keywords,
      canonicalUrl,
      robotsIndex,
      robotsFollow,
      robotsArchive,
      robotsSnippet,
      robotsImageIndex,
      ogTitle,
      ogDescription,
      ogType,
      ogUrl,
      ogSiteName,
      ogLocale,
      ogImageAlt,
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterSite,
      twitterCreator,
      twitterImageAlt,
      seoAuthor,
      publisher,
      focusKeyword,
      readingTime,
      metaImageAlt,
    } = formData;

    // Validation
    if (!title?.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    if (!slug?.trim()) {
      res.status(400).json({ message: "Permalink is required" });
      return;
    }

    const existingPost = await PostModel.findOne({ slug: slug.trim() });
    if (existingPost) {
      res.status(400).json({ message: "A post with this permalink already exists" });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ message: "Content is required" });
      return;
    }

    if (!author || !Types.ObjectId.isValid(author)) {
      res.status(400).json({ message: "Valid author ID is required" });
      return;
    }

    // Validate category IDs
    const validCategoryIds = categories.filter((cat: string | number | ObjectId | ObjectIdLike) =>
      Types.ObjectId.isValid(cat)
    );
    if (categories.length !== validCategoryIds.length) {
      res.status(400).json({ message: "Invalid category IDs provided" });
      return;
    }

    // Validate tag IDs
    const validTagIds = tags.filter((tag: string | number | ObjectId | ObjectIdLike) => Types.ObjectId.isValid(tag));
    if (tags.length !== validTagIds.length) {
      res.status(400).json({ message: "Invalid tag IDs provided" });
      return;
    }

    //TODOS handle image uploads
    let featuredImageId: Types.ObjectId | undefined;
    let thumbnailImageId: Types.ObjectId | undefined;
    const featuredImage = files.featuredImage;
    if (featuredImage) {
      const file = Array.isArray(featuredImage) ? featuredImage[0] : featuredImage;
      const fileBuffer = await fs.promises.readFile(file.filepath);

      const featuredImageResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "featured-image.jpg", {
        folder: "posts/featured-images",
        quality: 95,
        maxWidth: 750,
        maxHeight: 500,
      });

      const featuredImageDoc = {
        originalName: file.originalFilename || "featured-image.jpg",
        key: featuredImageResult.key,
        bucket: featuredImageResult.bucket,
        url: featuredImageResult.url,
        mimeType: featuredImageResult.mimeType,
        size: featuredImageResult.size || file.size,
      };

      const featuredImageMedia = new MediaModel(featuredImageDoc);
      await featuredImageMedia.save();
      featuredImageId = featuredImageMedia._id;

      const thumbnailImageResult = await s3Helper.uploadFile(
        fileBuffer,
        file.originalFilename || "thumbnail-image.jpg",
        {
          folder: "posts/thumbnail-images",
          quality: 80,
          maxWidth: 300,
          maxHeight: 200,
        }
      );

      const thumbnailImageDoc = {
        originalName: file.originalFilename || "thumbnail-image.jpg",
        key: thumbnailImageResult.key,
        bucket: thumbnailImageResult.bucket,
        url: thumbnailImageResult.url,
        mimeType: thumbnailImageResult.mimeType,
        size: thumbnailImageResult.size || file.size,
      };

      const thumbnailImageMedia = new MediaModel(thumbnailImageDoc);
      await thumbnailImageMedia.save();
      thumbnailImageId = thumbnailImageMedia._id;
    }

    const postData = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt?.trim(),
      content: content.trim(),
      author: author,
      type: type,
      categories: validCategoryIds,
      tags: validTagIds,
      featuredImage: featuredImageId,
      featuredImageCaption: featuredImageCaption?.trim(),
      thumbnailImage: thumbnailImageId,
      videoSourceUrl: videoSourceUrl?.trim(),
      videoDuration: videoDuration?.trim(),
      status,
      isFeatured,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim(),
      // SEO fields
      keywords: keywords?.trim(),
      canonicalUrl: canonicalUrl?.trim(),
      robotsIndex:
        robotsIndex !== undefined ? (typeof robotsIndex === "string" ? robotsIndex === "true" : robotsIndex) : true,
      robotsFollow:
        robotsFollow !== undefined ? (typeof robotsFollow === "string" ? robotsFollow === "true" : robotsFollow) : true,
      robotsArchive:
        robotsArchive !== undefined
          ? typeof robotsArchive === "string"
            ? robotsArchive === "true"
            : robotsArchive
          : true,
      robotsSnippet:
        robotsSnippet !== undefined
          ? typeof robotsSnippet === "string"
            ? robotsSnippet === "true"
            : robotsSnippet
          : true,
      robotsImageIndex:
        robotsImageIndex !== undefined
          ? typeof robotsImageIndex === "string"
            ? robotsImageIndex === "true"
            : robotsImageIndex
          : true,
      ogTitle: ogTitle?.trim(),
      ogDescription: ogDescription?.trim(),
      ogType: ogType?.trim(),
      ogUrl: ogUrl?.trim(),
      ogSiteName: ogSiteName?.trim(),
      ogLocale: ogLocale?.trim(),
      ogImageAlt: ogImageAlt?.trim(),
      twitterCard: twitterCard?.trim(),
      twitterTitle: twitterTitle?.trim(),
      twitterDescription: twitterDescription?.trim(),
      twitterSite: twitterSite?.trim(),
      twitterCreator: twitterCreator?.trim(),
      twitterImageAlt: twitterImageAlt?.trim(),
      seoAuthor: seoAuthor?.trim(),
      publisher: publisher?.trim(),
      focusKeyword: focusKeyword?.trim(),
      readingTime: readingTime?.trim(),
      metaImageAlt: metaImageAlt?.trim(),
    };

    //validate featured image when publishing
    if (status === PostStatus.PUBLISHED && !postData.featuredImage) {
      res.status(400).json({ message: "Featured image is required when publishing a post" });
      return;
    }

    const post = new PostModel(postData);
    await post.save();

    // Populate related data for response
    await post.populate("author", "fullName email avatar");
    await post.populate("categories", "name slug description");
    await post.populate("tags", "name slug description");
    await post.populate("featuredImage", "originalName key bucket mimeType url size");
    await post.populate("thumbnailImage", "originalName key bucket mimeType url size");

    res.status(201).json(post);
  } catch (error: unknown) {
    console.error("Error creating post:", error);

    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      if (
        error &&
        typeof error === "object" &&
        "keyPattern" in error &&
        error.keyPattern &&
        typeof error.keyPattern === "object" &&
        "slug" in error.keyPattern
      ) {
        res.status(400).json({ message: "A post with this title already exists" });
        return;
      }
    }

    if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
      if ("errors" in error && error.errors && typeof error.errors === "object") {
        const errors = Object.values(error.errors).map((err: unknown) => {
          if (err && typeof err === "object" && "message" in err) {
            return (err as { message: string }).message;
          }
          return "Validation error";
        });
        res.status(400).json({ message: "Validation failed", details: errors });
        return;
      }
    }

    res.status(500).json({ message: "Failed to create post" });
  }
};

// PUT /api/posts/:id - Update a post
export const updatePost = async (req: Request<{ id: string }, {}, UpdatePostRequest>, res: Response): Promise<void> => {
  // TODOS: Use formidable to handle file uploads for featured and thumbnail images
  try {
    const { id } = req.params;
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Accept only image files
        return mimetype?.startsWith("image/") || false;
      },
    });

    const [fields, files] = await form.parse(req);
    const updateData = firstValues(form, fields, ["categories", "tags"]);

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid post ID" });
      return;
    }

    // Get the current post to check if slug has changed
    const currentPost = await PostModel.findById(id);
    if (!currentPost) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (!updateData.slug?.trim()) {
      res.status(400).json({ message: "Permalink is required" });
      return;
    }

    // Only check for existing slug if the slug has changed
    if (updateData.slug.trim() !== currentPost.slug) {
      const existingPost = await PostModel.findOne({ slug: updateData.slug.trim() });
      if (existingPost) {
        res.status(400).json({ message: "A post with this permalink already exists" });
        return;
      }
    }

    // Validation
    if (updateData.title !== undefined && !updateData.title.trim()) {
      res.status(400).json({ message: "Title cannot be empty" });
      return;
    }

    if (updateData.content !== undefined && !updateData.content.trim()) {
      res.status(400).json({ message: "Content cannot be empty" });
      return;
    }

    // Validate category IDs
    if (updateData.categories) {
      const validCategoryIds = updateData.categories.filter((cat: string | number | ObjectId | ObjectIdLike) =>
        Types.ObjectId.isValid(cat)
      );
      if (updateData.categories.length !== validCategoryIds.length) {
        res.status(400).json({ message: "Invalid category IDs provided" });
        return;
      }
    }

    // Validate tag IDs
    if (updateData.tags) {
      const validTagIds = updateData.tags.filter((tag: string | number | ObjectId | ObjectIdLike) =>
        Types.ObjectId.isValid(tag)
      );
      if (updateData.tags.length !== validTagIds.length) {
        res.status(400).json({ message: "Invalid tag IDs provided" });
        return;
      }
    }

    // Set images to current images
    updateData.featuredImage = currentPost.featuredImage;
    updateData.thumbnailImage = currentPost.thumbnailImage;
    updateData.ogImage = currentPost.ogImage;
    updateData.metaImage = currentPost.metaImage;
    updateData.twitterImage = currentPost.twitterImage;

    //TODOS: Handle image uploads for featuredImage and thumbnailImage
    const featuredImage = files.featuredImage;
    if (featuredImage) {
      const file = Array.isArray(featuredImage) ? featuredImage[0] : featuredImage;
      const fileBuffer = await fs.promises.readFile(file.filepath);

      const featuredImageResult = await s3Helper.uploadFile(fileBuffer, file.originalFilename || "featured-image.jpg", {
        folder: "posts/featured-images",
        quality: 95,
        maxWidth: 750,
        maxHeight: 500,
      });

      const featuredImageDoc = {
        originalName: file.originalFilename || "featured-image.jpg",
        key: featuredImageResult.key,
        bucket: featuredImageResult.bucket,
        url: featuredImageResult.url,
        mimeType: featuredImageResult.mimeType,
        size: featuredImageResult.size || file.size,
      };

      const featuredImageMedia = new MediaModel(featuredImageDoc);
      await featuredImageMedia.save();
      updateData.featuredImage = featuredImageMedia._id;

      const thumbnailImageResult = await s3Helper.uploadFile(
        fileBuffer,
        file.originalFilename || "thumbnail-image.jpg",
        {
          folder: "posts/thumbnail-images",
          quality: 80,
          maxWidth: 300,
          maxHeight: 200,
        }
      );

      const thumbnailImageDoc = {
        originalName: file.originalFilename || "thumbnail-image.jpg",
        key: thumbnailImageResult.key,
        bucket: thumbnailImageResult.bucket,
        url: thumbnailImageResult.url,
        mimeType: thumbnailImageResult.mimeType,
        size: thumbnailImageResult.size || file.size,
      };

      const thumbnailImageMedia = new MediaModel(thumbnailImageDoc);
      await thumbnailImageMedia.save();
      updateData.thumbnailImage = thumbnailImageMedia._id;
    }

    // Build update object
    const update: Record<string, unknown> = sanitize(updateData);

    //validate featured image when publishing
    if (update.status === PostStatus.PUBLISHED && !update.featuredImage) {
      res.status(400).json({ message: "Featured image is required when publishing a post" });
      return;
    }

    const post = await PostModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("author", "fullName email avatar")
      .populate("categories", "name slug description")
      .populate("tags", "name slug description")
      .populate("featuredImage", "originalName key bucket mimeType url size")
      .populate("thumbnailImage", "originalName key bucket mimeType url size");

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.json(post);
  } catch (error: unknown) {
    console.error("Error updating post:", error);

    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      if (
        error &&
        typeof error === "object" &&
        "keyPattern" in error &&
        error.keyPattern &&
        typeof error.keyPattern === "object" &&
        "slug" in error.keyPattern
      ) {
        res.status(400).json({ message: "A post with this title already exists" });
        return;
      }
    }

    if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
      if ("errors" in error && error.errors && typeof error.errors === "object") {
        const errors = Object.values(error.errors).map((err: unknown) => {
          if (err && typeof err === "object" && "message" in err) {
            return (err as { message: string }).message;
          }
          return "Validation error";
        });
        res.status(400).json({ message: "Validation failed", details: errors });
        return;
      }
    }

    res.status(500).json({ message: "Failed to update post" });
  }
};

// DELETE /api/posts/:id - Delete a post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid post ID" });
      return;
    }

    const post = await PostModel.findByIdAndDelete(id);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.json({ message: "Post deleted successfully", deletedPost: { id: post._id, title: post.title } });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// POST /api/posts/:id/views - Increment post view count
export const incrementViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid post ID" });
      return;
    }

    const post = await PostModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true });

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.json({ viewCount: post.viewCount });
  } catch (error) {
    console.error("Error incrementing views:", error);
    res.status(500).json({ message: "Failed to increment views" });
  }
};

// GET /api/posts/:id/related - Get related posts
export const getRelatedPosts = async (
  req: Request<{ id: string }, {}, {}, RelatedPostsQueryParams>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = "5", categories, tags } = req.query;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid post ID" });
      return;
    }

    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

    let categoryIds: Types.ObjectId[] | undefined;
    let tagIds: Types.ObjectId[] | undefined;

    if (categories) {
      const categoryIdStrings = categories.split(",").map((cat) => cat.trim());
      const validCategoryIds = categoryIdStrings.filter((cat) => Types.ObjectId.isValid(cat));
      if (validCategoryIds.length > 0) {
        categoryIds = validCategoryIds.map((cat) => new Types.ObjectId(cat));
      }
    }

    if (tags) {
      const tagIdStrings = tags.split(",").map((tag) => tag.trim());
      const validTagIds = tagIdStrings.filter((tag) => Types.ObjectId.isValid(tag));
      if (validTagIds.length > 0) {
        tagIds = validTagIds.map((tag) => new Types.ObjectId(tag));
      }
    }

    const posts = await PostModel.getRelatedPosts(id, categoryIds, tagIds, limitNum);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching related posts:", error);
    res.status(500).json({ message: "Failed to fetch related posts" });
  }
};

// GET /api/posts/trending - Get trending posts
export const getTrendingPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = "10", days = "7" } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const daysNum = Math.max(1, parseInt(days as string));

    const posts = await PostModel.getTrendingPosts(limitNum, daysNum);
    res.json(posts);
  } catch (error) {
    console.error("Error fetching trending posts:", error);
    res.status(500).json({ message: "Failed to fetch trending posts" });
  }
};

// GET /api/posts/stats - Get post statistics
export const getPostStats = async (
  req: Request<{}, PostStatsResponse, {}, PostStatsQueryParams>,
  res: Response
): Promise<void> => {
  try {
    const { days = "30" } = req.query;
    const daysNum = Math.max(1, parseInt(days));

    const [stats, trending, mostViewed, recentlyPublished] = await Promise.all([
      PostModel.getPostStats(),
      PostModel.getTrendingPosts(5, daysNum),
      PostModel.getMostViewed(5, daysNum),
      PostModel.getPublishedPosts(5, 0),
    ]);

    res.json({
      ...stats,
      trending,
      mostViewed,
      recentlyPublished,
    });
  } catch (error) {
    console.error("Error fetching post statistics:", error);
    res.status(500).json({ message: "Failed to fetch post statistics" });
  }
};
