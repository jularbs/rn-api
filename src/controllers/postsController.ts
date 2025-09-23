//TODOS: Handle ScheduledAt
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PostModel, PostStatus } from '@/models/Post';
import { 
  CreatePostRequest, 
  UpdatePostRequest, 
  PostQueryParams, 
  PostStatsQueryParams,
  RelatedPostsQueryParams,
  PostListResponse,
  PostStatsResponse
} from '@/types/postTypes';

// Get all posts with advanced filtering and pagination
export const getPosts = async (req: Request<{}, PostListResponse, {}, PostQueryParams>, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      status,
      category,
      author,
      tags,
      search,
      featured,
      breaking,
      sortBy = 'scheduledAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: Record<string, unknown> = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Category filter
    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    // Author filter
    if (author) {
      filter.author = new Types.ObjectId(author);
    }

    // Tags filter
    if (tags) {
      const tagIds = tags.split(',').map(tag => new Types.ObjectId(tag.trim()));
      filter.tags = { $in: tagIds };
    }

    // Featured filter
    if (featured !== undefined) {
      filter.isFeatured = featured === 'true';
    }

    // Breaking news filter
    if (breaking !== undefined) {
      filter.isBreaking = breaking === 'true';
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) {
        createdAtFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        createdAtFilter.$lte = new Date(endDate);
      }
      filter.createdAt = createdAtFilter;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [posts, total] = await Promise.all([
      PostModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name email')
        .populate('category', 'name slug')
        .populate('tags', 'name slug')
        .populate('featuredImage', 'key bucket mimeType')
        .populate('thumbnailImage', 'key bucket mimeType'),
      PostModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        status,
        category,
        author,
        tags: tags ? tags.split(',') : undefined,
        search,
        featured: featured ? featured === 'true' : undefined,
        breaking: breaking ? breaking === 'true' : undefined,
        dateRange: startDate || endDate ? { 
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined
        } : undefined
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// Get a single post by ID or slug
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let post;
    if (Types.ObjectId.isValid(id)) {
      post = await PostModel.findById(id);
    }
    
    if (!post) {
      post = await PostModel.findOne({ slug: id });
    }

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Populate related data
    await post.populate('author', 'name email avatar');
    await post.populate('category', 'name slug description');
    await post.populate('tags', 'name slug description');
    await post.populate('featuredImage', 'key bucket mimeType');
    await post.populate('thumbnailImage', 'key bucket mimeType');

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// Create a new post
export const createPost = async (req: Request<{}, {}, CreatePostRequest>, res: Response): Promise<void> => {
  try {
    const {
      title,
      excerpt,
      content,
      author,
      category,
      tags = [],
      featuredImage,
      thumbnailImage,
      status = PostStatus.DRAFT,
      scheduledAt,
      isBreaking = false,
      isFeatured = false,
      metaTitle,
      metaDescription
    } = req.body;

    // Validation
    if (!title?.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (!author || !Types.ObjectId.isValid(author)) {
      res.status(400).json({ error: 'Valid author ID is required' });
      return;
    }

    if (category && !Types.ObjectId.isValid(category)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    if (featuredImage && !Types.ObjectId.isValid(featuredImage)) {
      res.status(400).json({ error: 'Invalid featured image ID' });
      return;
    }

    if (thumbnailImage && !Types.ObjectId.isValid(thumbnailImage)) {
      res.status(400).json({ error: 'Invalid thumbnail image ID' });
      return;
    }

    // Validate tag IDs
    const validTagIds = tags.filter(tag => Types.ObjectId.isValid(tag));
    if (tags.length !== validTagIds.length) {
      res.status(400).json({ error: 'Invalid tag IDs provided' });
      return;
    }

    const postData = {
      title: title.trim(),
      excerpt: excerpt?.trim(),
      content: content.trim(),
      author: new Types.ObjectId(author),
      category: category ? new Types.ObjectId(category) : undefined,
      tags: validTagIds.map(tag => new Types.ObjectId(tag)),
      featuredImage: featuredImage ? new Types.ObjectId(featuredImage) : undefined,
      thumbnailImage: thumbnailImage ? new Types.ObjectId(thumbnailImage) : undefined,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      isBreaking,
      isFeatured,
      metaTitle: metaTitle?.trim(),
      metaDescription: metaDescription?.trim()
    };

    const post = new PostModel(postData);
    await post.save();

    // Populate related data for response
    await post.populate('author', 'name email avatar');
    await post.populate('category', 'name slug description');
    await post.populate('tags', 'name slug description');
    await post.populate('featuredImage', 'originalName fileName mimeType size url');
    await post.populate('thumbnailImage', 'originalName fileName mimeType size url');

    res.status(201).json(post);
  } catch (error: unknown) {
    console.error('Error creating post:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      if (error && typeof error === 'object' && 'keyPattern' in error && 
          error.keyPattern && typeof error.keyPattern === 'object' && 'slug' in error.keyPattern) {
        res.status(400).json({ error: 'A post with this title already exists' });
        return;
      }
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      if ('errors' in error && error.errors && typeof error.errors === 'object') {
        const errors = Object.values(error.errors).map((err: unknown) => {
          if (err && typeof err === 'object' && 'message' in err) {
            return (err as { message: string }).message;
          }
          return 'Validation error';
        });
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
    }

    res.status(500).json({ error: 'Failed to create post' });
  }
};

// Update a post
export const updatePost = async (req: Request<{ id: string }, {}, UpdatePostRequest>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    // Validation
    if (updateData.title !== undefined && !updateData.title.trim()) {
      res.status(400).json({ error: 'Title cannot be empty' });
      return;
    }

    if (updateData.content !== undefined && !updateData.content.trim()) {
      res.status(400).json({ error: 'Content cannot be empty' });
      return;
    }

    if (updateData.category && !Types.ObjectId.isValid(updateData.category)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    if (updateData.featuredImage && !Types.ObjectId.isValid(updateData.featuredImage)) {
      res.status(400).json({ error: 'Invalid featured image ID' });
      return;
    }

    if (updateData.thumbnailImage && !Types.ObjectId.isValid(updateData.thumbnailImage)) {
      res.status(400).json({ error: 'Invalid thumbnail image ID' });
      return;
    }

    // Validate tag IDs
    if (updateData.tags) {
      const validTagIds = updateData.tags.filter(tag => Types.ObjectId.isValid(tag));
      if (updateData.tags.length !== validTagIds.length) {
        res.status(400).json({ error: 'Invalid tag IDs provided' });
        return;
      }
    }

    // Build update object
    const update: Record<string, unknown> = {};
    
    if (updateData.title !== undefined) update.title = updateData.title.trim();
    if (updateData.excerpt !== undefined) update.excerpt = updateData.excerpt?.trim();
    if (updateData.content !== undefined) update.content = updateData.content.trim();
    if (updateData.category !== undefined) update.category = updateData.category ? new Types.ObjectId(updateData.category) : null;
    if (updateData.tags !== undefined) update.tags = updateData.tags.map(tag => new Types.ObjectId(tag));
    if (updateData.featuredImage !== undefined) update.featuredImage = updateData.featuredImage ? new Types.ObjectId(updateData.featuredImage) : null;
    if (updateData.thumbnailImage !== undefined) update.thumbnailImage = updateData.thumbnailImage ? new Types.ObjectId(updateData.thumbnailImage) : null;
    if (updateData.status !== undefined) update.status = updateData.status;
    if (updateData.scheduledAt !== undefined) update.scheduledAt = updateData.scheduledAt ? new Date(updateData.scheduledAt) : null;
    if (updateData.isBreaking !== undefined) update.isBreaking = updateData.isBreaking;
    if (updateData.isFeatured !== undefined) update.isFeatured = updateData.isFeatured;
    if (updateData.metaTitle !== undefined) update.metaTitle = updateData.metaTitle?.trim();
    if (updateData.metaDescription !== undefined) update.metaDescription = updateData.metaDescription?.trim();

    const post = await PostModel.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    )
      .populate('author', 'name email avatar')
      .populate('category', 'name slug description')
      .populate('tags', 'name slug description')
      .populate('featuredImage', 'originalName fileName mimeType size url')
      .populate('thumbnailImage', 'originalName fileName mimeType size url');

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json(post);
  } catch (error: unknown) {
    console.error('Error updating post:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      if (error && typeof error === 'object' && 'keyPattern' in error && 
          error.keyPattern && typeof error.keyPattern === 'object' && 'slug' in error.keyPattern) {
        res.status(400).json({ error: 'A post with this title already exists' });
        return;
      }
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      if ('errors' in error && error.errors && typeof error.errors === 'object') {
        const errors = Object.values(error.errors).map((err: unknown) => {
          if (err && typeof err === 'object' && 'message' in err) {
            return (err as { message: string }).message;
          }
          return 'Validation error';
        });
        res.status(400).json({ error: 'Validation failed', details: errors });
        return;
      }
    }

    res.status(500).json({ error: 'Failed to update post' });
  }
};

// Delete a post
export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const post = await PostModel.findByIdAndDelete(id);

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({ message: 'Post deleted successfully', deletedPost: { id: post._id, title: post.title } });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// Increment post view count
export const incrementViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const post = await PostModel.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json({ viewCount: post.viewCount });
  } catch (error) {
    console.error('Error incrementing views:', error);
    res.status(500).json({ error: 'Failed to increment views' });
  }
};

// Publish a post
export const publishPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const post = await PostModel.findByIdAndUpdate(
      id,
      { 
        status: PostStatus.PUBLISHED,
        publishedAt: new Date()
      },
      { new: true }
    )
      .populate('author', 'name email avatar')
      .populate('category', 'name slug description')
      .populate('tags', 'name slug description')
      .populate('featuredImage', 'originalName fileName mimeType size url')
      .populate('thumbnailImage', 'originalName fileName mimeType size url');

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json(post);
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ error: 'Failed to publish post' });
  }
};

// Get published posts
export const getPublishedPosts = async (req: Request<{}, PostListResponse, {}, PostQueryParams>, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      PostModel.getPublishedPosts(limitNum, skip),
      PostModel.countDocuments({ 
        status: PostStatus.PUBLISHED,
        publishedAt: { $lte: new Date() }
      })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching published posts:', error);
    res.status(500).json({ error: 'Failed to fetch published posts' });
  }
};

// Get featured posts
export const getFeaturedPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '5' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string)));

    const posts = await PostModel.getFeaturedPosts(limitNum);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    res.status(500).json({ error: 'Failed to fetch featured posts' });
  }
};

// Get breaking news
export const getBreakingNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '3' } = req.query;
    const limitNum = Math.min(10, Math.max(1, parseInt(limit as string)));

    const posts = await PostModel.getBreakingNews(limitNum);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching breaking news:', error);
    res.status(500).json({ error: 'Failed to fetch breaking news' });
  }
};

// Get posts by category
export const getPostsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    if (!Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({ error: 'Invalid category ID' });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      PostModel.getByCategory(categoryId, limitNum, skip),
      PostModel.countDocuments({ 
        category: new Types.ObjectId(categoryId),
        status: PostStatus.PUBLISHED,
        publishedAt: { $lte: new Date() }
      })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    res.status(500).json({ error: 'Failed to fetch posts by category' });
  }
};

// Get posts by author
export const getPostsByAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { authorId } = req.params;
    const { page = '1', limit = '10' } = req.query;

    if (!Types.ObjectId.isValid(authorId)) {
      res.status(400).json({ error: 'Invalid author ID' });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [posts, total] = await Promise.all([
      PostModel.getByAuthor(authorId, limitNum, skip),
      PostModel.countDocuments({ 
        author: new Types.ObjectId(authorId),
        status: PostStatus.PUBLISHED,
        publishedAt: { $lte: new Date() }
      })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts by author:', error);
    res.status(500).json({ error: 'Failed to fetch posts by author' });
  }
};

// Search posts
export const searchPosts = async (req: Request<{}, PostListResponse, {}, PostQueryParams>, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10' } = req.query;

    if (!search?.trim()) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const searchRegex = new RegExp(search.trim(), 'i');
    const filter = {
      $or: [
        { title: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex }
      ],
      status: PostStatus.PUBLISHED,
      publishedAt: { $lte: new Date() }
    };

    const [posts, total] = await Promise.all([
      PostModel.find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name email avatar')
        .populate('category', 'name slug description')
        .populate('tags', 'name slug description')
        .populate('featuredImage', 'originalName fileName mimeType size url')
        .populate('thumbnailImage', 'originalName fileName mimeType size url'),
      PostModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        search: search.trim()
      }
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ error: 'Failed to search posts' });
  }
};

// Get related posts
export const getRelatedPosts = async (req: Request<{ id: string }, {}, {}, RelatedPostsQueryParams>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = '5', category, tags } = req.query;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));
    
    let categoryId: Types.ObjectId | undefined;
    let tagIds: Types.ObjectId[] | undefined;

    if (category && Types.ObjectId.isValid(category)) {
      categoryId = new Types.ObjectId(category);
    }

    if (tags) {
      const tagIdStrings = tags.split(',').map(tag => tag.trim());
      const validTagIds = tagIdStrings.filter(tag => Types.ObjectId.isValid(tag));
      if (validTagIds.length > 0) {
        tagIds = validTagIds.map(tag => new Types.ObjectId(tag));
      }
    }

    const posts = await PostModel.getRelatedPosts(id, categoryId, tagIds, limitNum);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({ error: 'Failed to fetch related posts' });
  }
};

// Get most viewed posts
export const getMostViewedPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', days = '30' } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const daysNum = Math.max(1, parseInt(days as string));

    const posts = await PostModel.getMostViewed(limitNum, daysNum);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching most viewed posts:', error);
    res.status(500).json({ error: 'Failed to fetch most viewed posts' });
  }
};

// Get trending posts
export const getTrendingPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', days = '7' } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const daysNum = Math.max(1, parseInt(days as string));

    const posts = await PostModel.getTrendingPosts(limitNum, daysNum);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
};

// Get post statistics
export const getPostStats = async (req: Request<{}, PostStatsResponse, {}, PostStatsQueryParams>, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query;
    const daysNum = Math.max(1, parseInt(days));

    const [stats, trending, mostViewed, recentlyPublished] = await Promise.all([
      PostModel.getPostStats(),
      PostModel.getTrendingPosts(5, daysNum),
      PostModel.getMostViewed(5, daysNum),
      PostModel.getPublishedPosts(5, 0)
    ]);

    res.json({
      ...stats,
      trending,
      mostViewed,
      recentlyPublished
    });
  } catch (error) {
    console.error('Error fetching post statistics:', error);
    res.status(500).json({ error: 'Failed to fetch post statistics' });
  }
};

// Get scheduled posts
export const getScheduledPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const posts = await PostModel.getScheduledPosts();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
};
